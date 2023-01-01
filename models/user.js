/** User class for message.ly */
const { BCRYPT_WORK_FACTOR } = require("../config");
const db = require("../db");
const ExpressError = require("../expressError");
const bcrypt = require("bcrypt");

/** User of the site. */

class User {
  /** register new user -- returns
   *    {username, password, first_name, last_name, phone}
   */
  static async register({ username, password, first_name, last_name, phone }) {
    if (!username || !password || !first_name || !last_name || !phone) {
      throw new ExpressError(" All user data is required", 400);
    }
    const hashedPassword = await bcrypt.hash(password, BCRYPT_WORK_FACTOR);
    const result = await db.query(
      `INSERT INTO users 
      (username, password, first_name, last_name, phone, join_at, last_login_at)
      VALUES ($1, $2, $3, $4, $5, current_timestamp, current_timestamp)
      RETURNING username, password, first_name, last_name, phone`,
      [username, hashedPassword, first_name, last_name, phone]
    );
    return result.rows[0];
  }

  /** Authenticate: is this username/password valid? Returns boolean. */

  static async authenticate(username, password) {
    const result = await db.query(
      `SELECT username, password 
       FROM users
       WHERE username = $1`,
      [username]
    );
    const user = result.rows[0];
    return user && (await bcrypt.compare(password, user.password));
  }

  /** Update last_login_at for user */

  static async updateLoginTimestamp(username) {
    const result = await db.query(
      `UPDATE users
       SET last_login_at = current_timestamp
       WHERE username = $1 RETURNING username`,
      [username]
    );
    if (!result.rows[0]) {
      throw new ExpressError(`User '${username}'not found`, 404);
    }
  }

  /** All: basic info on all users:
   * [{username, first_name, last_name, phone}, ...] */

  static async all() {
    const results = await db.query(`
    SELECT username, first_name, last_name, phone
    FROM users`);
    return results.rows;
  }

  /** Get: get user by username
   *
   * returns {username,
   *          first_name,
   *          last_name,
   *          phone,
   *          join_at,
   *          last_login_at } */

  static async get(username) {
    const result = await db.query(`
    SELECT username, first_name, last_name, phone, join_at, last_login_at
    FROM users WHERE username = $1`,
    [username]);
    return result.rows[0];
  }

  /** Return messages from this user.
   *
   * [{id, to_user, body, sent_at, read_at}]
   *
   * where to_user is
   *   {username, first_name, last_name, phone}
   */

  static async messagesFrom(username) {
    const results = await db.query(`
    SELECT id, body, sent_at, read_at, to_username AS to_user
    FROM messages WHERE from_username = $1`,
    [username])
    for (let i = 0; i < results.rows.length; i++){

      results.rows[i].to_user = await this.get(results.rows[i].to_user)
      delete results.rows[i].to_user.join_at
      delete results.rows[i].to_user.last_login_at
    }
    return results.rows
  }

  /** Return messages to this user.
   *
   * [{id, from_user, body, sent_at, read_at}]
   *
   * where from_user is
   *   {username, first_name, last_name, phone}
   */

  static async messagesTo(username) {
    const results = await db.query(`
    SELECT id, body, sent_at, read_at, from_username AS from_user
    FROM messages WHERE to_username = $1`,
    [username])
    for (let i = 0; i < results.rows.length; i++){

      results.rows[i].from_user = await this.get(results.rows[i].from_user)
      delete results.rows[i].from_user.join_at
      delete results.rows[i].from_user.last_login_at
    }
    return results.rows
  }
}
module.exports = User;
