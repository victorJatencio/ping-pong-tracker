module.exports = {
    testEnvironment: 'node',
    
    // Only look for tests in the tests/ directory
    testMatch: [
        '<rootDir>/tests/**/*.test.js',
        '<rootDir>/tests/**/*.spec.js'
    ],
    
    // Explicitly ignore src/tests and other directories
    testPathIgnorePatterns: [
        '/node_modules/',
        '/src/tests/',
        '/src/'
    ],
    
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
    
    collectCoverage: false,
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/index.js',
        '!src/**/*.test.js',
        '!src/**/*.spec.js',
        '!src/tests/**'
    ],
    
    moduleDirectories: ['node_modules', 'src'],
    testTimeout: 60000,
    clearMocks: true,
    restoreMocks: true,
    verbose: true,
    
    // Force Jest to only look in specific directories
    roots: ['<rootDir>/tests']
};
