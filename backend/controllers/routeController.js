const { Route } = require('../models');

const formatRoute = (route) => {
    const r = route.toJSON();
    r._id = r.id;
    return r;
};

const getRoutes = async (req, res) => {
    try {
        const routes = await Route.findAll();
        res.json(routes.map(formatRoute));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const addRoute = async (req, res) => {
    try {
        const { name, stops, distance, estimatedDuration } = req.body;
        const stopsArr = typeof stops === 'string' ? stops.split(',').map(s => s.trim()).filter(Boolean) : (stops || []);
        if (stopsArr.length < 2) {
            return res.status(400).json({ message: 'Provide at least 2 stops (comma-separated)' });
        }
        const route = await Route.create({ name, stops: stopsArr, distance, estimatedDuration });
        res.status(201).json(formatRoute(route));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getLocations = async (req, res) => {
    try {
        const routes = await Route.findAll({ attributes: ['stops'] });
        const locations = new Set();
        routes.forEach(r => {
            const stops = Array.isArray(r.stops) ? r.stops : [];
            stops.forEach(s => locations.add(s));
        });
        res.json([...locations].sort());
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteRoute = async (req, res) => {
    try {
        const route = await Route.findByPk(req.params.id);
        if (!route) {
            return res.status(404).json({ message: 'Route not found' });
        }
        await route.destroy();
        res.json({ message: 'Route removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getRoutes, getLocations, addRoute, deleteRoute };
