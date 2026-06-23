const mongoose = require('mongoose');

const membershipSchema = new mongoose.Schema(
  {},
  { timestamps: true, strict: false }
);

module.exports = mongoose.model('Membership', membershipSchema);
