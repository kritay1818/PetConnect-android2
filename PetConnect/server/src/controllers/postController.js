const mongoose = require('mongoose');

const Group = require('../models/Group');
const Pet = require('../models/Pet');
const Post = require('../models/Post');
const User = require('../models/User');

const ensureValidObjectId = (id, res, label = 'ObjectId') => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400);
    throw new Error(`Invalid ${label}`);
  }
};

const includesObjectId = (ids, id) =>
  ids.some((existingId) => existingId.toString() === id.toString());

const canAccessPrivateGroup = (group, userId) =>
  group.admin.toString() === userId.toString() || includesObjectId(group.members, userId);

const getAccessibleGroupIds = async (userId) => {
  const groups = await Group.find({
    $or: [{ isPrivate: false }, { admin: userId }, { members: userId }]
  }).select('_id');

  return groups.map((group) => group._id);
};

const getVisiblePostFilter = async (userId, baseFilters = {}) => {
  const accessibleGroupIds = await getAccessibleGroupIds(userId);

  return {
    $and: [
      baseFilters,
      {
        $or: [
          { group: { $exists: false } },
          { group: null },
          { group: { $in: accessibleGroupIds } }
        ]
      }
    ]
  };
};

const populatePost = (query) =>
  query
    .populate('author', 'username email')
    .populate('group', 'name category isPrivate')
    .populate('pet', 'name type breed imageUrl imageUri photoUrl')
    .populate('likes', 'username email')
    .populate('comments.user', 'username email');

const findPostById = async (id, res) => {
  ensureValidObjectId(id, res, 'post id');

  const post = await Post.findById(id);
  if (!post) {
    res.status(404);
    throw new Error('Post not found');
  }

  return post;
};

const ensureAuthor = (post, userId, res) => {
  if (post.author.toString() !== userId.toString()) {
    res.status(403);
    throw new Error('Only the author can edit or delete this post');
  }
};

const ensureGroupExists = async (groupId, res, userId) => {
  if (!groupId) {
    return;
  }

  ensureValidObjectId(groupId, res, 'group id');

  const group = await Group.findById(groupId);
  if (!group) {
    res.status(404);
    throw new Error('Group not found');
  }

  if (userId && group.isPrivate && !canAccessPrivateGroup(group, userId)) {
    res.status(403);
    throw new Error('Not authorized to post in this private group');
  }
};

const ensureCanViewPost = async (post, userId, res) => {
  if (!post.group) {
    return;
  }

  const groupId = typeof post.group === 'object' ? post.group._id : post.group;
  const group = await Group.findById(groupId).select('isPrivate admin members');

  if (!group) {
    res.status(404);
    throw new Error('Group not found');
  }

  if (group.isPrivate && !canAccessPrivateGroup(group, userId)) {
    res.status(403);
    throw new Error('Not authorized to view posts from this private group');
  }
};

const ensurePetExists = async (petId, userId, res) => {
  if (!petId) {
    return;
  }

  ensureValidObjectId(petId, res, 'pet id');

  const pet = await Pet.findById(petId);
  if (!pet) {
    res.status(404);
    throw new Error('Pet not found');
  }

  if (pet.owner.toString() !== userId.toString()) {
    res.status(403);
    throw new Error('You can only attach one of your own pets to a post');
  }
};

const createPost = async (req, res, next) => {
  try {
    await ensureGroupExists(req.body.group, res, req.user._id);
    await ensurePetExists(req.body.pet, req.user._id, res);

    const post = await Post.create({
      content: req.body.content,
      imageUrl: req.body.imageUrl,
      imageUri: req.body.imageUri,
      photoUrl: req.body.photoUrl,
      videoUrl: req.body.videoUrl,
      videoUri: req.body.videoUri,
      stickerData: req.body.stickerData,
      group: req.body.group,
      pet: req.body.pet,
      author: req.user._id,
      likes: [],
      comments: []
    });

    const populatedPost = await populatePost(Post.findById(post._id));

    res.status(201).json({ post: populatedPost });
  } catch (error) {
    next(error);
  }
};

const getPosts = async (req, res, next) => {
  try {
    const visibleFilter = await getVisiblePostFilter(req.user._id);
    const posts = await populatePost(Post.find(visibleFilter)).sort({ createdAt: -1 });

    res.status(200).json({ posts });
  } catch (error) {
    next(error);
  }
};

const getMyPosts = async (req, res, next) => {
  try {
    const posts = await populatePost(Post.find({ author: req.user._id })).sort({
      createdAt: -1
    });

    res.status(200).json({ posts });
  } catch (error) {
    next(error);
  }
};

const getFeedPosts = async (req, res, next) => {
  try {
    const groups = await Group.find({ members: req.user._id }).select('_id');
    const groupIds = groups.map((group) => group._id);
    const currentUser = await User.findById(req.user._id).select('friends');
    const friendIds = currentUser?.friends || [];

    const visibleFilter = await getVisiblePostFilter(req.user._id, {
      $or: [
        { group: { $in: groupIds } },
        { author: req.user._id },
        { author: { $in: friendIds } }
      ]
    });

    const posts = await populatePost(Post.find(visibleFilter)).sort({
      createdAt: -1
    });

    res.status(200).json({ posts });
  } catch (error) {
    next(error);
  }
};

const searchPosts = async (req, res, next) => {
  try {
    const { keyword, group, startDate, endDate } = req.query;
    const filters = {};

    if (keyword) {
      filters.content = { $regex: keyword, $options: 'i' };
    }

    if (group) {
      ensureValidObjectId(group, res, 'group id');
      filters.group = group;
    }

    if (startDate || endDate) {
      filters.createdAt = {};

      if (startDate) {
        filters.createdAt.$gte = new Date(startDate);
      }

      if (endDate) {
        filters.createdAt.$lte = new Date(endDate);
      }
    }

    const visibleFilter = await getVisiblePostFilter(req.user._id, filters);
    const posts = await populatePost(Post.find(visibleFilter)).sort({ createdAt: -1 });

    res.status(200).json({ posts });
  } catch (error) {
    next(error);
  }
};

const getPostById = async (req, res, next) => {
  try {
    ensureValidObjectId(req.params.id, res, 'post id');

    const rawPost = await Post.findById(req.params.id);
    if (!rawPost) {
      res.status(404);
      throw new Error('Post not found');
    }

    await ensureCanViewPost(rawPost, req.user._id, res);

    const post = await populatePost(Post.findById(req.params.id));
    if (!post) {
      res.status(404);
      throw new Error('Post not found');
    }

    res.status(200).json({ post });
  } catch (error) {
    next(error);
  }
};

const updatePost = async (req, res, next) => {
  try {
    const post = await findPostById(req.params.id, res);
    ensureAuthor(post, req.user._id, res);
    await ensureGroupExists(req.body.group, res, req.user._id);
    await ensurePetExists(req.body.pet, req.user._id, res);

    const allowedUpdates = [
      'content',
      'imageUrl',
      'imageUri',
      'photoUrl',
      'videoUrl',
      'videoUri',
      'stickerData',
      'group',
      'pet'
    ];
    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        post[field] = req.body[field];
      }
    });

    const updatedPost = await post.save();
    const populatedPost = await populatePost(Post.findById(updatedPost._id));

    res.status(200).json({ post: populatedPost });
  } catch (error) {
    next(error);
  }
};

const deletePost = async (req, res, next) => {
  try {
    const post = await findPostById(req.params.id, res);
    ensureAuthor(post, req.user._id, res);

    await post.deleteOne();

    res.status(200).json({ message: 'Post deleted successfully' });
  } catch (error) {
    next(error);
  }
};

const likePost = async (req, res, next) => {
  try {
    const post = await findPostById(req.params.id, res);
    await ensureCanViewPost(post, req.user._id, res);

    if (includesObjectId(post.likes, req.user._id)) {
      res.status(409);
      throw new Error('User already liked this post');
    }

    post.likes.push(req.user._id);
    await post.save();

    const populatedPost = await populatePost(Post.findById(post._id));

    res.status(200).json({ post: populatedPost });
  } catch (error) {
    next(error);
  }
};

const commentOnPost = async (req, res, next) => {
  try {
    const post = await findPostById(req.params.id, res);
    await ensureCanViewPost(post, req.user._id, res);

    post.comments.push({
      user: req.user._id,
      text: req.body.text
    });

    await post.save();

    const populatedPost = await populatePost(Post.findById(post._id));

    res.status(201).json({ post: populatedPost });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPost,
  getPosts,
  getMyPosts,
  getFeedPosts,
  searchPosts,
  getPostById,
  updatePost,
  deletePost,
  likePost,
  commentOnPost
};
