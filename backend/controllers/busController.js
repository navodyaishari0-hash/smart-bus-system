const { Bus, User } = require('../models');

const formatBus = (bus) => {
    const b = bus.toJSON();
    b._id = b.id;
    if (b.conductor) b.conductor._id = b.conductor.id;
    return b;
};

const getBuses = async (req, res) => {
    try {
        const buses = await Bus.findAll({
            include: [{ model: User, as: 'conductor', attributes: ['id', 'name', 'email'] }]
        });
        res.json(buses.map(formatBus));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const addBus = async (req, res) => {
    try {
        const { busNumber, capacity, type, conductor, photo } = req.body;
        const bus = await Bus.create({ busNumber, capacity, type, conductorId: conductor, photo });
        res.status(201).json(formatBus(bus));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteBus = async (req, res) => {
    try {
        const bus = await Bus.findByPk(req.params.id);
        if (!bus) {
            return res.status(404).json({ message: 'Bus not found' });
        }
        await bus.destroy();
        res.json({ message: 'Bus removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateBusStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const bus = await Bus.findByPk(req.params.id);
        if (!bus) {
            return res.status(404).json({ message: 'Bus not found' });
        }
        bus.status = status;
        await bus.save();
        res.json(formatBus(bus));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateBus = async (req, res) => {
    try {
        const bus = await Bus.findByPk(req.params.id);
        if (!bus) return res.status(404).json({ message: 'Bus not found' });

        const { busNumber, capacity, type, conductor, photo, status } = req.body;
        if (busNumber !== undefined) bus.busNumber = busNumber;
        if (capacity !== undefined) bus.capacity = capacity;
        if (type !== undefined) bus.type = type;
        if (conductor !== undefined) bus.conductorId = conductor || null;
        if (photo !== undefined) bus.photo = photo;
        if (status !== undefined) bus.status = status;
        await bus.save();

        const updated = await Bus.findByPk(req.params.id, {
            include: [{ model: User, as: 'conductor', attributes: ['id', 'name', 'email'] }]
        });
        res.json(formatBus(updated));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getBuses, addBus, deleteBus, updateBusStatus, updateBus };
