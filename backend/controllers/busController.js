const Bus = require('../models/Bus');

const getBuses = async (req, res) => {
    try {
        const buses = await Bus.find().populate('conductor', 'name email');
        res.json(buses);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const addBus = async (req, res) => {
    try {
        const { busNumber, capacity, type, conductor, photo } = req.body;
        const bus = await Bus.create({ busNumber, capacity, type, conductor, photo });
        res.status(201).json(bus);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteBus = async (req, res) => {
    try {
        const bus = await Bus.findById(req.params.id);
        if (!bus) {
            return res.status(404).json({ message: 'Bus not found' });
        }
        await bus.deleteOne();
        res.json({ message: 'Bus removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateBusStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const bus = await Bus.findById(req.params.id);
        if (!bus) {
            return res.status(404).json({ message: 'Bus not found' });
        }
        bus.status = status;
        await bus.save();
        res.json(bus);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getBuses, addBus, deleteBus, updateBusStatus };
