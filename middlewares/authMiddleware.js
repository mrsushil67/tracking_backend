const axios = require('axios');

const getToken = async () => {
    try {
        const url = 'https://api.fleetx.io/api/v1/login';
        const data = {
            username: 'Diljeet.singh+0038@fleetx.io',
            password: 'EPqw59tO@',
            grant_type: 'password',
        };

        const response = await axios.post(url, data, {
            headers: {
                Authorization: 'Basic ZmxlZXR4OnNlY3JldA==',
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            httpsAgent: new (require('https').Agent)({
                rejectUnauthorized: false,
            }),
            transformRequest: [
                (data) => {
                    return Object.keys(data)
                        .map((key) => encodeURIComponent(key) + '=' + encodeURIComponent(data[key]))
                        .join('&');
                },
            ],
        });

        return response.data.access_token;
    } catch (error) {
        if (error.response) {
            console.error('Error getting token (response):', error.response.data); // Log the response data
        } else {
            console.error('Error getting token (other):', error.message);
        }
        throw error;
    }
}
// getToken()

module.exports = {getToken}
