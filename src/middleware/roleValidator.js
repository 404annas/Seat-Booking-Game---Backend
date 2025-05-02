const RoleValidation = (ProvidedRoles) => {
  return (req, res, next) => {
    const userRole = req.user?.role; // Safely accessing user role
    const isAuthorized = ProvidedRoles.some(role => userRole === role); // Exact match

    if (!isAuthorized) {
      return res.status(403).json({ message: "You are not authorized to perform this action" });
    }

    next();
  };
};

module.exports = RoleValidation;