const mongoose = require('mongoose');

const Group = require('../models/Group');
const User = require('../models/User');

const ensureValidObjectId = (id, res, label = 'ObjectId') => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400);
    throw new Error(`Invalid ${label}`);
  }
};

const includesObjectId = (ids, id) =>
  ids.some((existingId) => existingId.toString() === id.toString());

const ensureGroupAdmin = (group, userId, res) => {
  if (group.admin.toString() !== userId.toString()) {
    res.status(403);
    throw new Error('Only the group admin can perform this action');
  }
};

const findGroupById = async (id, res) => {
  ensureValidObjectId(id, res, 'group id');

  const group = await Group.findById(id);
  if (!group) {
    res.status(404);
    throw new Error('Group not found');
  }

  return group;
};

const createGroup = async (req, res, next) => {
  try {
    const group = await Group.create({
      ...req.body,
      admin: req.user._id,
      members: [req.user._id],
      pendingRequests: []
    });

    res.status(201).json({ group });
  } catch (error) {
    next(error);
  }
};

const getGroups = async (req, res, next) => {
  try {
    const groups = await Group.find()
      .populate('admin', 'username email')
      .populate('members', 'username email')
      .sort({ createdAt: -1 });

    res.status(200).json({ groups });
  } catch (error) {
    next(error);
  }
};

const getMyGroups = async (req, res, next) => {
  try {
    const groups = await Group.find({
      $or: [{ admin: req.user._id }, { members: req.user._id }]
    })
      .populate('admin', 'username email')
      .populate('members', 'username email')
      .sort({ createdAt: -1 });

    res.status(200).json({ groups });
  } catch (error) {
    next(error);
  }
};

const getGroupById = async (req, res, next) => {
  try {
    ensureValidObjectId(req.params.id, res, 'group id');

    const group = await Group.findById(req.params.id)
      .populate('admin', 'username email')
      .populate('members', 'username email')
      .populate('pendingRequests', 'username email');

    if (!group) {
      res.status(404);
      throw new Error('Group not found');
    }

    res.status(200).json({ group });
  } catch (error) {
    next(error);
  }
};

const updateGroup = async (req, res, next) => {
  try {
    const group = await findGroupById(req.params.id, res);
    ensureGroupAdmin(group, req.user._id, res);

    const allowedUpdates = ['name', 'description', 'category', 'isPrivate'];
    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        group[field] = req.body[field];
      }
    });

    const updatedGroup = await group.save();

    res.status(200).json({ group: updatedGroup });
  } catch (error) {
    next(error);
  }
};

const deleteGroup = async (req, res, next) => {
  try {
    const group = await findGroupById(req.params.id, res);
    ensureGroupAdmin(group, req.user._id, res);

    await group.deleteOne();

    res.status(200).json({ message: 'Group deleted successfully' });
  } catch (error) {
    next(error);
  }
};

const joinGroup = async (req, res, next) => {
  try {
    const group = await findGroupById(req.params.id, res);
    const userId = req.user._id;

    if (includesObjectId(group.members, userId)) {
      res.status(409);
      throw new Error('User is already a member of this group');
    }

    if (includesObjectId(group.pendingRequests, userId)) {
      res.status(409);
      throw new Error('Join request is already pending');
    }

    if (group.isPrivate) {
      group.pendingRequests.push(userId);
      await group.save();

      return res.status(200).json({
        message: 'Join request sent',
        group
      });
    }

    group.members.push(userId);
    await group.save();

    return res.status(200).json({
      message: 'Joined group successfully',
      group
    });
  } catch (error) {
    return next(error);
  }
};

const approveMember = async (req, res, next) => {
  try {
    const group = await findGroupById(req.params.id, res);
    ensureValidObjectId(req.params.userId, res, 'user id');
    ensureGroupAdmin(group, req.user._id, res);

    const user = await User.findById(req.params.userId);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    if (!includesObjectId(group.pendingRequests, req.params.userId)) {
      res.status(404);
      throw new Error('Pending request not found');
    }

    group.pendingRequests = group.pendingRequests.filter(
      (pendingUserId) => pendingUserId.toString() !== req.params.userId
    );

    if (!includesObjectId(group.members, req.params.userId)) {
      group.members.push(req.params.userId);
    }

    await group.save();

    res.status(200).json({
      message: 'Member approved successfully',
      group
    });
  } catch (error) {
    next(error);
  }
};

const rejectMember = async (req, res, next) => {
  try {
    const group = await findGroupById(req.params.id, res);
    ensureValidObjectId(req.params.userId, res, 'user id');
    ensureGroupAdmin(group, req.user._id, res);

    if (!includesObjectId(group.pendingRequests, req.params.userId)) {
      res.status(404);
      throw new Error('Pending request not found');
    }

    group.pendingRequests = group.pendingRequests.filter(
      (pendingUserId) => pendingUserId.toString() !== req.params.userId
    );

    await group.save();

    res.status(200).json({
      message: 'Join request rejected successfully',
      group
    });
  } catch (error) {
    next(error);
  }
};

const removeMember = async (req, res, next) => {
  try {
    const group = await findGroupById(req.params.id, res);
    ensureValidObjectId(req.params.userId, res, 'user id');
    ensureGroupAdmin(group, req.user._id, res);

    if (group.admin.toString() === req.params.userId) {
      res.status(400);
      throw new Error('Group admin cannot be removed from members');
    }

    if (!includesObjectId(group.members, req.params.userId)) {
      res.status(404);
      throw new Error('Member not found in this group');
    }

    group.members = group.members.filter(
      (memberId) => memberId.toString() !== req.params.userId
    );

    await group.save();

    res.status(200).json({
      message: 'Member removed successfully',
      group
    });
  } catch (error) {
    next(error);
  }
};

const searchGroups = async (req, res, next) => {
  try {
    const { name, category, isPrivate } = req.query;
    const filters = {};

    if (name) {
      filters.name = { $regex: name, $options: 'i' };
    }

    if (category) {
      filters.category = category;
    }

    if (isPrivate !== undefined) {
      filters.isPrivate = isPrivate === 'true';
    }

    const groups = await Group.find(filters)
      .populate('admin', 'username email')
      .populate('members', 'username email')
      .sort({ createdAt: -1 });

    res.status(200).json({ groups });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createGroup,
  getGroups,
  getMyGroups,
  getGroupById,
  updateGroup,
  deleteGroup,
  joinGroup,
  approveMember,
  rejectMember,
  removeMember,
  searchGroups
};
