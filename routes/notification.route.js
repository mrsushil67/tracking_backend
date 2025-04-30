const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/notification.controller');

router.get('/getAllNotifications', NotificationController.getUnreadNotifications);
router.post('/updateNotification', NotificationController.updatedNotificationStatus);

module.exports = router;