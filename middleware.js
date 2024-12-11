// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
    try {
        let token = req.header('x-token');
        console.log(token+"  in middleware ")
        if (!token) {
            return res.status(400).send('Token Not found');
        }

        let decoded = jwt.verify(token, 'secretkey');
        req.user = decoded.user; // Attach the decoded user object to the request
        next();
    } catch (err) {
        console.log(err);
        return res.status(500).send('Invalid token');
    }
};
