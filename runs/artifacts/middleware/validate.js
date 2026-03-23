/**
 * validate.js
 * -----------
 * Generic Joi validation middleware factory.
 * Usage: router.post("/", validate(schema), controller)
 */

export const validate = (schema, target = "body") =>
  (req, res, next) => {
    const { error, value } = schema.validate(req[target], {
      abortEarly: false,        // collect all errors, not just the first
      stripUnknown: true,       // drop unrecognised fields
      convert: true,            // coerce types (e.g. "1" → 1)
    });

    if (error) {
      const details = error.details.map((d) => ({
        field: d.context?.key || d.path.join("."),
        message: d.message.replace(/['"]/g, ""),
      }));

      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: details,
      });
    }

    // Replace req[target] with the sanitised + coerced value
    req[target] = value;
    next();
  };
