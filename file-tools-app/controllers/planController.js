const { listActivePlans } = require('../services/planService');
const { successResponse, errorResponse } = require('../utils/responseHandler');

async function listPlans(req, res) {
  try {
    const plans = await listActivePlans();
    return successResponse(res, { plans });
  } catch (error) {
    return errorResponse(res, 'Unable to load plans.', 500);
  }
}

module.exports = { listPlans };