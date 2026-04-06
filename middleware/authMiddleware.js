exports.checkRole = (requiredRole) => {
    return (req, res, next) => {
        const userRole = req.body.role;
        if (userRole !== requiredRole) {
            return res.status(403).json({ error: 'Access denied' });
        }
        next();
    };
};
