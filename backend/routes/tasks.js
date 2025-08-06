// routes/tasks.js
const express = require('express');
const router = express.Router();
const Task = require('../models/Task');

// ➕ Créer une tâche
router.post('/', async (req, res) => {
  try {
    const newTask = new Task(req.body);
    const savedTask = await newTask.save();
    res.status(201).json(savedTask);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📥 Obtenir toutes les tâches
router.get('/', async (req, res) => {
  try {
    const tasks = await Task.find();
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Modifier une tâche (méthode robuste)
router.put('/:id', async (req, res) => {
  try {
    // 1. On ne sélectionne que les champs que l'on autorise à modifier
    const { title, description, quadrant, completed, dueDate, priority } = req.body;
    const fieldsToUpdate = { title, description, quadrant, completed, dueDate, priority };

    // 2. On retire les champs qui n'ont pas été fournis (undefined)
    //    pour ne pas écraser des données existantes par erreur.
    Object.keys(fieldsToUpdate).forEach(key => fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key]);

    // 3. On utilise l'opérateur $set pour une mise à jour sécurisée
    //    et on force la validation du modèle (pour l'enum de la priorité).
    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      { $set: fieldsToUpdate },
      { new: true, runValidators: true, context: 'query' }
    );

    if (!updatedTask) {
      return res.status(404).json({ message: "Tâche non trouvée" });
    }
    
    res.json(updatedTask);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🗑 Supprimer une tâche
router.delete('/:id', async (req, res) => {
  try {
    await Task.findByIdAndDelete(req.params.id);
    res.json({ message: 'Tâche supprimée' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
