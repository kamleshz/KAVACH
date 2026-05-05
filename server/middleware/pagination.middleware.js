export const paginationMiddleware =
  (defaults = {}) =>
  (req, res, next) => {
    const defaultPage = defaults.page || 1;
    const defaultLimit = defaults.limit || 25;
    const maxLimit = defaults.maxLimit || 100;

    const page = Math.max(
      Number.parseInt(req.query.page, 10) || defaultPage,
      1,
    );
    const limit = Math.min(
      Math.max(Number.parseInt(req.query.limit, 10) || defaultLimit, 1),
      maxLimit,
    );

    req.pagination = {
      page,
      limit,
      skip: (page - 1) * limit,
    };

    res.paginate = ({ data, total }) => ({
      data,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    });

    next();
  };
