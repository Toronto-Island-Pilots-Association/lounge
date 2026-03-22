module.exports = {
  metrics: {
    count: jest.fn(),
    distribution: jest.fn(),
    gauge: jest.fn(),
  },
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
}
