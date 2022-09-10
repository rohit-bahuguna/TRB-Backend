const BigPromise = require('../middlewares/bigPromise');
const customError = require('../utils/customError');
const productModel = require('../models/productModel');
const cloudinary = require('cloudinary').v2;
const WhereClause = require('../utils/WhereClause');

exports.addProducts = BigPromise(async (req, res, next) => {
	// images
	let imagesArray = [];
	if (!req.files) {
		return next(new customError('images are required'), 401);
	}
	if (req.files) {
		for (let i = 0; i < req.files.photos.length; i++) {
			let result = await cloudinary.uploader.upload(
				req.files.photos[i].tempFilePath,
				{
					folder: 'products'
				}
			);
			imagesArray.push({
				id: result.public_id,
				secure_url: result.secure_url
			});
		}
	}

	req.body.photos = imagesArray;
	req.body.user = req.user.id;

	const product = await productModel.create(req.body);
	res.status(200).json({
		success: true,
		product
	});
});

exports.getAllProducts = BigPromise(async (req, res, next) => {
	const resultPerPage = 6;

	const totalProductCount = await productModel.countDocuments();

	let products = new WhereClause(productModel.find(), req.query)
		.search()
		.filter();
	// console.log(products);
	// console.log('<=====================================>');
	// console.log(await products.base.clone());
	const filteredProductNumber = products.length;

	products.pager(resultPerPage);

	products = await products.base.clone();

	res.status(200).json({
		success: true,
		products,
		filteredProductNumber,
		totalProductCount
	});
});

exports.adminGetAllProduct = BigPromise(async (req, res, next) => {
	const products = await productModel.find();

	res.status(200).json({
		success: true,
		products
	});
});

exports.getOneProduct = BigPromise(async (req, res, next) => {
	const { id } = req.params;
	console.log(id);
	const product = await productModel.findById(id);
	if (!product) {
		return next(new customError('no product found '), 400);
	}

	res.status(200).json({
		success: true,
		product
	});
});

exports.adminUpdateProduct = BigPromise(async (req, res, next) => {
	const { id } = req.params;

	const product = await productModel.findById(id);

	if (!product) {
		return next(new customError('product now found'), 400);
	}

	let imagesArray = [];

	if (req.files) {
		for (let i = 0; i < req.files.photos.length; i++) {
			await cloudinary.uploader.destroy(product.photos[i].id);
		}

		for (let i = 0; i < req.files.photos.length; i++) {
			let result = await cloudinary.uploader.upload(
				req.files.photos[i].tempFilePath,
				{
					folder: 'products' // env
				}
			);
			imagesArray.push({
				id: result.public_id,
				secure_url: result.secure_url
			});
		}
		req.body.photos = imagesArray;
	}

	req.body.user = req.user.id;
	const updatedProduct = await productModel.findByIdAndUpdate(id, req.body, {
		new: true,
		runValidators: true
	});

	res.status(200).json({
		success: true,
		message: 'product updated successfully',
		updatedProduct
	});
});

exports.adminDeleteProduct = BigPromise(async (req, res, next) => {
	const { id } = req.params;

	const product = await productModel.findById(id);

	if (!product) {
		return next(new customError('product now found'), 400);
	}

	for (let i = 0; i < product.photos.length; i++) {
		await cloudinary.uploader.destroy(product.photos[i].id);
	}

	await product.remove();

	res.status(200).json({
		success: true,
		message: 'product deleted successfully'
	});
});

exports.addReview = BigPromise(async (req, res, next) => {
	const { rating, comment, productId } = req.body;

	const newReview = {
		user: req.user._id,
		name: req.user.name,
		rating: Number(rating),
		comment
	};

	const product = await productModel.findById(productId);

	const alreadyReviwed = product.reviews.find(
		rev => rev.user.toString() === req.user._id.toString()
	);

	if (alreadyReviwed) {
		product.reviews.forEach(review => {
			if (review.user.toString() === req.user.id.toString()) {
				review.Comment = comment;
				review.rating = rating;
			}
		});
	} else {
		product.reviews.push(newReview);
		product.numberOfReviews = product.reviews.length;
	}

	product.rating =
		product.reviews.reduce((acc, item) => item.rating + acc, 0) /
		product.reviews.length;

	await product.save({ validateBeforeSave: false });

	res.status(200).json({
		success: true,
		message: 'thanks for your review'
	});
});

exports.deleteAReview = BigPromise(async (req, res, next) => {
	const { productId } = req.query;

	const product = await productModel.findById(productId);

	const reviews = product.reviews.filter(
		rev => rev.user.toString() === req.Comment.user._id.toString()
	);

	const numberOfReviews = reviews.length;

	const rating =
		product.reviews.reduce((acc, item) => item.rating + acc, 0) /
		product.reviews.length;

	const updatedProduct = await product.findByIdAndUpdate(
		productId,
		{
			reviews,
			rating,
			numberOfReviews
		},
		{
			new: true,
			runValidators: true
		}
	);

	res.status(200).json({
		success: true,
		message: 'review got deleted',
		updatedProduct
	});
});

exports.getOnlyReviewsForOneProduct = BigPromise(async (req, res, next) => {
	const { productId } = req.query;
	const product = await productModel.findById(productId);

	res.status(200).json({
		success: true,
		reviews: product.reviews
	});
});
