describe('Prom Metrics plugin', () => {
  describe('parse', () => {
    it('Should trace error during parse', () => {});
    it('Should trace valid parse result', () => {});
    it('Should skip parse when parse = false', () => {});
  });

  describe('validate', () => {
    it('Should trace error during validate', () => {});
    it('Should trace valid validations result', () => {});
    it('Should skip validate when validate = false', () => {});
  });

  describe('contextBuilding', () => {
    it('Should trace valid contextBuilding result', () => {});
    it('Should skip contextBuilding when contextBuilding = false', () => {});
  });

  describe('execute', () => {
    it('Should trace error during execute with a single error', () => {});
    it('Should trace error during execute with a multiple errors', () => {});
    it('Should trace valid execute result', () => {});
    it('Should skip execute when execute = false', () => {});
  });

  describe('errors', () => {
    it('Should not trace parse errors when not needed', () => {});
    it('Should not trace validate errors when not needed', () => {});
    it('Should not trace execute errors when not needed', () => {});
  });

  describe('resolvers', () => {
    it('Should not trace resolvers when not needed', () => {});
    it('Should trace all resolvers times correctly', () => {});
    it('Should trace only specified resolvers when resolversWhitelist is used', () => {});
  });

  describe('deprecation', () => {
    it('Should not trace deprecation when not needed', () => {});
    it('Should trace all deprecated fields times correctly', () => {});
  });
});
