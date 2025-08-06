document.addEventListener('DOMContentLoaded', () => {
    // Éléments du DOM
    const taskModal = document.getElementById('taskModal');
    const taskForm = document.getElementById('taskForm');
    const modalTitle = document.getElementById('modalTitle');
    const matrix = document.querySelector('.matrix');

    // Champs du formulaire
    const taskTitleInput = document.getElementById('taskTitle');
    const taskDescriptionInput = document.getElementById('taskDescription');
    const taskDueDateInput = document.getElementById('taskDueDate');
    const taskPriorityInput = document.getElementById('taskPriority');
    const editTaskIdInput = document.getElementById('editTaskId');

    const API_URL = 'http://localhost:3000/api/tasks';
    let tasks = {}; // Stockage local des tâches groupées par quadrant

    // --- Fonctions de l'API ---
    const api = {
        getTasks: () => fetch(API_URL).then(res => res.json()),
        createTask: (task) => fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(task),
        }).then(res => res.json()),
        updateTask: (id, updates) => fetch(`${API_URL}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
        }).then(res => res.json()),
        deleteTask: (id) => fetch(`${API_URL}/${id}`, { method: 'DELETE' }),
    };

    // --- Fonctions principales ---
    const renderTasks = () => {
        document.querySelectorAll('.tasks').forEach(container => container.innerHTML = '');
        for (const quadrantId in tasks) {
            const container = document.getElementById(`${quadrantId}-tasks`);
            if (container) {
                tasks[quadrantId].forEach(task => {
                    const taskElement = document.createElement('div');
                    taskElement.className = `task-item ${task.completed ? 'completed' : ''}`;
                    taskElement.dataset.id = task._id; // Utilise l'ID de MongoDB

                    const priority = task.priority || 'moyenne';
                    const priorityCapitalized = priority.charAt(0).toUpperCase() + priority.slice(1);
                    const priorityColors = { haute: '#E03131', moyenne: '#FFA94D', basse: '#37B24D' };
                    const formattedDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '';

                    taskElement.innerHTML = `
                        <div class="task-text">
                            <strong>${escapeHtml(task.title)}</strong>
                            <span style="margin-left:8px; color:${priorityColors[priority]}; font-weight:bold;">${priorityCapitalized}</span>
                            ${formattedDate ? `<br><small><i class='fa-solid fa-clock'></i> ${formattedDate}</small>` : ''}
                            ${task.description ? `<br><small>${escapeHtml(task.description)}</small>` : ''}
                        </div>
                        <div class="task-actions">
                            <button class="complete-btn" title="Terminer/Remettre en cours"><i class="fa-solid ${task.completed ? 'fa-rotate-right' : 'fa-check'}"></i></button>
                            <button class="edit-btn" title="Modifier"><i class="fa-solid fa-pen"></i></button>
                            <button class="delete-btn" title="Supprimer"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    `;
                    container.appendChild(taskElement);
                });
            }
        }
    };
    
    const loadAndRenderTasks = async () => {
        try {
            const allTasks = await api.getTasks();
            // Réinitialise et groupe les tâches par quadrant
            tasks = {
                'urgent-important': [],
                'not-urgent-important': [],
                'urgent-not-important': [],
                'not-urgent-not-important': [],
            };
            allTasks.forEach(task => {
                if (tasks[task.quadrant]) {
                    tasks[task.quadrant].push(task);
                }
            });
            renderTasks();
        } catch (error) {
            console.error("Erreur lors du chargement des tâches:", error);
            alert("Impossible de charger les tâches depuis le serveur.");
        }
    };
    

    const openModal = (quadrantId, taskId = null) => {
        taskForm.dataset.quadrant = quadrantId;
        taskForm.reset();
        taskDueDateInput.min = new Date().toISOString().split('T')[0];

        if (taskId) {
            const task = tasks[quadrantId].find(t => t._id == taskId);
            modalTitle.textContent = 'Modifier la tâche';
            taskTitleInput.value = task.title;
            taskDescriptionInput.value = task.description;
            taskDueDateInput.value = task.dueDate ? task.dueDate.split('T')[0] : '';
            taskPriorityInput.value = task.priority;
            editTaskIdInput.value = taskId;
        } else {
            modalTitle.textContent = 'Ajouter une nouvelle tâche';
            editTaskIdInput.value = '';
        }
        taskModal.style.display = 'block';
    };

    const closeModal = () => {
        taskModal.style.display = 'none';
    };

    const escapeHtml = (text) => {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }

    // --- Gestion des événements (délégation) ---
    matrix.addEventListener('click', async (e) => {
        const target = e.target;
        const quadrantElement = target.closest('.quadrant');
        if (!quadrantElement) return;
        
        if (target.closest('.add-task-btn')) {
            openModal(quadrantElement.id);
        }

        const taskItem = target.closest('.task-item');
        if (!taskItem) return;
        const taskId = taskItem.dataset.id;
        const quadrantId = quadrantElement.id;
        
        if (target.closest('.edit-btn')) {
            openModal(quadrantId, taskId);
        } else if (target.closest('.delete-btn')) {
            if (confirm('Êtes-vous sûr de vouloir supprimer cette tâche ?')) {
                await api.deleteTask(taskId);
                loadAndRenderTasks();
            }
        } else if (target.closest('.complete-btn')) {
            const task = tasks[quadrantId].find(t => t._id == taskId);
            await api.updateTask(taskId, { completed: !task.completed });
            loadAndRenderTasks();
        }
    });

    taskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = taskTitleInput.value.trim();
        if (!title) return alert('Le titre est obligatoire.');

        const dueDate = taskDueDateInput.value;
        if (dueDate && new Date(dueDate) < new Date(new Date().setHours(0, 0, 0, 0))) {
            return alert('La date limite ne peut pas être dans le passé.');
        }

        const taskId = editTaskIdInput.value;
        const quadrantId = taskForm.dataset.quadrant;

        const updatedValues = {
            title,
            description: taskDescriptionInput.value,
            dueDate: dueDate || null,
            priority: taskPriorityInput.value,
            quadrant: quadrantId,
        };

        if (taskId) {
            // C'est une modification, il faut préserver les champs existants
            const originalTask = tasks[quadrantId].find(t => t._id == taskId);
            const taskToSend = { ...originalTask, ...updatedValues };
            await api.updateTask(taskId, taskToSend);
        } else {
            // C'est une nouvelle tâche
            await api.createTask(updatedValues);
        }

        loadAndRenderTasks();
        closeModal();
    });

    taskModal.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal') || e.target.classList.contains('cancel-btn')) {
            closeModal();
        }
    });

    // Rendu initial
    loadAndRenderTasks();
});
