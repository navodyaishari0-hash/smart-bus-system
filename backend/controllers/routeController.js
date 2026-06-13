const Route = require('../models/Route');

const getRoutes = async (req, res) => {
    try {
        const routes = await Route.find();
        res.json(routes);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const addRoute = async (req, res) => {
    try {
        const { name, origin, destination, distance, estimatedDuration } = req.body;
        const route = await Route.create({ name, origin, destination, distance, estimatedDuration });
        res.status(201).json(route);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteRoute = async (req, res) => {
    try {
        const route = await Route.findById(req.params.id);
        if (!route) {
            return res.status(404).json({ message: 'Route not found' });
        }
        await route.deleteOne();
        res.json({ message: 'Route removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getRoutes, addRoute, deleteRoute };
