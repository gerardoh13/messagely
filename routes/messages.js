const express = require("express");
const ExpressError = require("../expressError");
const router = new express.Router();
const Message = require("../models/message");
const { ensureLoggedIn, ensureCorrectUser } = require("../middleware/auth");

/** GET /:id - get detail of message.
 *
 * => {message: {id,
 *               body,
 *               sent_at,
 *               read_at,
 *               from_user: {username, first_name, last_name, phone},
 *               to_user: {username, first_name, last_name, phone}}
 *
 * Make sure that the currently-logged-in users is either the to or from user.
 *
 **/
router.get("/:id", async function (req, res, next) {


  try {
    let message = await Message.get(req.params.id);
    if (
      req.user.username !== message.to_user.username &&
      req.user.username !== message.from_user.username
    ) {
      throw new ExpressError("Unauthorized", 401);
    }
    return res.json({ message });
  } catch (err) {
    return next(err);
  }
});

/** POST / - post message.
 *
 * {to_username, body} =>
 *   {message: {id, from_username, to_username, body, sent_at}}
 *
 **/
router.post("/", ensureLoggedIn, async function (req, res, next) {
  try {
    let { to_username, body } = req.body;
    if (!to_username || !body) {
      throw new ExpressError(
        "Recipient and message body must be provided",
        400
      );
    }
    let from_username = req.user.username;
    let message = await Message.create({ from_username, to_username, body });
    return res.json({ message });
  } catch (err) {
    return next(err);
  }
});

/** POST/:id/read - mark message as read:
 *
 *  => {message: {id, read_at}}
 *
 * Make sure that the only the intended recipient can mark as read.
 *
 **/
router.post("/:id/read", async function (req, res, next) {
  console.log(req.user.username);
  try {
    let msg = await Message.get(req.params.id);
    if (msg.to_user.username !== req.user.username) {
      throw new ExpressError("Unauthorized", 401);
    }
    let message = await Message.markRead(req.params.id);
    return res.json({ message });
  } catch (err) {
    return next(err);
  }
});
module.exports = router;
