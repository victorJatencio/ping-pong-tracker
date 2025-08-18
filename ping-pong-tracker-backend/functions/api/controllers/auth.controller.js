const login = async (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Login successful',
        data: { user: {}, token: 'test-token' }
    });
};

const refreshToken = async (req, res) => {
    res.status(200).json({
        success: true,
        data: { token: 'new-test-token' }
    });
};

const getProfile = async (req, res) => {
    res.status(200).json({
        success: true,
        data: { user: req.user }
    });
};

module.exports = {
    login,
    refreshToken,
    getProfile
};
