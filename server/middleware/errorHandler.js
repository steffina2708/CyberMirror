const errorHandler = (err, req, res, next) => {
	const statusCode = err.statusCode || 500;
	console.error(`[ERROR] ${err.message}`);
	res.status(statusCode).json({
		message: err.message || 'Internal Server Error',
		...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
	});
};

module.exports = errorHandler;
