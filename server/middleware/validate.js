import { z } from 'zod';

export const validate = (schema) => (req, res, next) => {
  try {
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Validation Error',
        error: true,
        success: false,
        errors: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message
        }))
      });
    }
    next(error);
  }
};
