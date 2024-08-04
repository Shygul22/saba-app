document.addEventListener('DOMContentLoaded', () => {
    const addTaskButton = document.getElementById('addTaskButton');
    const taskInput = document.getElementById('taskInput');
    const taskReasonInput = document.getElementById('taskReason');
    const taskReminder = document.getElementById('taskReminder');
    const taskDueTime = document.getElementById('taskDueTime');
    const taskList = document.getElementById('taskList');
    const editModal = document.getElementById('editModal');
    const closeModal = document.querySelector('.close');
    const completeBtn = document.getElementById('completeBtn');
    const notCompleteBtn = document.getElementById('notCompleteBtn');
    const resetBtn = document.getElementById('resetBtn');
    const deleteBtn = document.getElementById('deleteBtn');
    const deleteAllTasksButton = document.getElementById('deleteAllTasksButton');
    const themeSelect = document.getElementById('themeSelect');
    const settingsButton = document.getElementById('settingsButton');
    const settingsPanel = document.getElementById('settingsPanel');
    const confirmationModal = document.getElementById('confirmationModal');
    const modalMessage = document.getElementById('modalMessage');
    const yesButton = document.getElementById('yesButton');
    const noButton = document.getElementById('noButton');

    let reminderIntervals = new Map();
    let currentTaskElement = null;

    function loadTasks() {
        const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        tasks.forEach(task => {
            const li = createTaskElement(task.text, task.reason, task.reminderTime, task.dueTime, task.completed, task.creationTime);
            taskList.appendChild(li);
            if (task.reminderTime > new Date().getTime()) {
                scheduleReminder(task.text, task.reminderTime, li, li.querySelector('span'));
            }
        });
        sortTasks();
    }

    function addNewTask(taskText, taskReason, reminderTime, dueTime) {
        const creationTime = new Date().toISOString();
        const li = createTaskElement(taskText, taskReason, reminderTime, dueTime, false, creationTime);
        taskList.appendChild(li);
        if (reminderTime > new Date().getTime()) {
            scheduleReminder(taskText, reminderTime, li, li.querySelector('span'));
        }
        saveTasks();
        sortTasks();
    }

    addTaskButton.addEventListener('click', () => {
        const taskText = taskInput.value;
        const taskReason = taskReasonInput.value;
        const reminderTime = new Date(taskReminder.value).getTime();
        const dueTime = new Date(taskDueTime.value).getTime();
        if (taskText && taskReason && !isNaN(reminderTime) && !isNaN(dueTime)) {
            addNewTask(taskText, taskReason, reminderTime, dueTime);
            taskInput.value = '';
            taskReasonInput.value = '';
            taskReminder.value = '';
            taskDueTime.value = '';
        } else {
            alert('Please enter valid task details.');
        }
    });

    function saveTasks() {
        const tasks = [];
        taskList.querySelectorAll('li').forEach(li => {
            tasks.push({
                text: li.dataset.text,
                reason: li.dataset.reason,
                reminderTime: li.dataset.reminderTime,
                dueTime: li.dataset.dueTime,
                completed: li.dataset.completed === 'true',
                creationTime: li.dataset.creationTime
            });
        });
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }

    function formatTime(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${hours}h ${minutes}m ${seconds}s`;
    }

    function scheduleReminder(taskText, reminderTime, taskElement, timeElement) {
        const alertThreshold = 3 * 60 * 1000; // 3 minutes in milliseconds
        const dueAlertThreshold = 30 * 60 * 1000; // 30 minutes in milliseconds
        const now = new Date().getTime();
        const remainingTime = reminderTime - now;
        const dueTime = parseInt(taskElement.dataset.dueTime);
        const remainingDueTime = dueTime - now;

        const updateTime = () => {
            const currentTime = new Date().getTime();
            const updatedRemainingTime = reminderTime - currentTime;
            const updatedRemainingDueTime = dueTime - currentTime;

            if (taskElement.dataset.completed === 'true') {
                clearInterval(reminderIntervals.get(taskElement));
                reminderIntervals.delete(taskElement);
                return;
            }

            if (updatedRemainingTime <= 0) {
                // Task is due or overdue
                clearInterval(reminderIntervals.get(taskElement));
                reminderIntervals.delete(taskElement);
                timeElement.innerHTML = 'Reminder time has passed.';
                return;
            }

            // Update reminder time display
            if (updatedRemainingTime <= alertThreshold) {
                timeElement.innerHTML = `Reminder in ${Math.ceil(updatedRemainingTime / 60000)} minutes`;
            } else {
                timeElement.innerHTML = `Time left: ${formatTime(updatedRemainingTime)}`;
            }

            // Check for due time alert
            if (updatedRemainingDueTime <= dueAlertThreshold && updatedRemainingDueTime > 0) {
                if (!taskElement.querySelector('.due-alert')) {
                    const alertElement = document.createElement('div');
                    alertElement.className = 'due-alert';
                    alertElement.textContent = `Due time approaching in ${Math.ceil(updatedRemainingDueTime / 60000)} minutes!`;
                    taskElement.appendChild(alertElement);
                }
            } else {
                const alertElement = taskElement.querySelector('.due-alert');
                if (alertElement) {
                    alertElement.remove();
                }
            }
        };

        if (remainingTime > 0) {
            updateTime();
            const intervalId = setInterval(updateTime, 1000);
            reminderIntervals.set(taskElement, intervalId);
        } else {
            // Immediate update for overdue tasks
            timeElement.innerHTML = 'Reminder time has passed.';
        }
    }

    function showConfirmationModal(message, onYes) {
        modalMessage.textContent = message;
        confirmationModal.style.display = 'block';

        yesButton.onclick = () => {
            confirmationModal.style.display = 'none';
            if (typeof onYes === 'function') {
                onYes();
            }
        };

        noButton.onclick = () => {
            confirmationModal.style.display = 'none';
        };
    }

    function createTaskElement(taskText, taskReason, reminderTime, dueTime, completed = false, creationTime) {
        const li = document.createElement('li');
        li.textContent = `${taskText}`;
        li.dataset.text = taskText;
        li.dataset.reason = taskReason;
        li.dataset.reminderTime = reminderTime;
        li.dataset.dueTime = dueTime;
        li.dataset.completed = completed;
        li.dataset.creationTime = creationTime;

        const span = document.createElement('span');
        li.appendChild(span);
        li.style.color = completed ? 'green' : 'black';
        li.style.textDecoration = completed ? 'line-through' : 'none';

        // Display the due alert if applicable
        if (dueTime > new Date().getTime()) {
            const dueAlertElement = document.createElement('div');
            dueAlertElement.className = 'due-alert';
            li.appendChild(dueAlertElement);
        }

        li.addEventListener('click', () => {
            currentTaskElement = li;
            openEditModal();
        });

        return li;
    }

    function openEditModal() {
        if (!currentTaskElement) return;

        document.getElementById('editTaskNameDisplay').textContent = currentTaskElement.dataset.text;
        document.getElementById('editTaskReasonDisplay').textContent = `Reason: ${currentTaskElement.dataset.reason}`;
        document.getElementById('editReminderTimeDisplay').textContent = `Reminder Time: ${currentTaskElement.dataset.reminderTime ? new Date(parseInt(currentTaskElement.dataset.reminderTime)).toLocaleString() : 'None'}`;
        document.getElementById('editCreationTime').textContent = `Created at: ${new Date(currentTaskElement.dataset.creationTime).toLocaleString()}`;

        const dueTime = currentTaskElement.dataset.dueTime ? new Date(parseInt(currentTaskElement.dataset.dueTime)).toLocaleString() : 'None';
        document.getElementById('editDueTimeDisplay').textContent = `Due Time: ${dueTime}`;

        editModal.style.display = 'block';

        resetBtn.onclick = handleResetReminder;
        completeBtn.onclick = handleComplete;
        notCompleteBtn.onclick = handleNotComplete;
        deleteBtn.onclick = handleDelete;
    }

    function handleResetReminder() {
        if (!currentTaskElement) return;

        const taskText = prompt('Enter new task name:', currentTaskElement.dataset.text);
        const taskReason = prompt('Enter new task reason:', currentTaskElement.dataset.reason);
        const newReminderTime = prompt('Enter new reminder time (format: YYYY-MM-DDTHH:MM):', currentTaskElement.dataset.reminderTime ? new Date(parseInt(currentTaskElement.dataset.reminderTime)).toISOString().slice(0, 16) : '');

        if (taskText && taskReason && newReminderTime) {
            currentTaskElement.dataset.text = taskText;
            currentTaskElement.dataset.reason = taskReason;
            currentTaskElement.dataset.reminderTime = new Date(newReminderTime).getTime();
            currentTaskElement.dataset.completed = 'false';
            currentTaskElement.style.color = 'black';
            currentTaskElement.style.textDecoration = 'none';
            saveTasks();
            scheduleReminder(taskText, new Date(newReminderTime).getTime(), currentTaskElement, currentTaskElement.querySelector('span'));
            closeEditModal();
        }
    }

    function handleComplete() {
        if (!currentTaskElement) return;

        currentTaskElement.dataset.completed = 'true';
        currentTaskElement.style.color = 'green';
        currentTaskElement.style.textDecoration = 'line-through';
        saveTasks();
        closeEditModal();
    }

    function handleNotComplete() {
        if (!currentTaskElement) return;

        currentTaskElement.dataset.completed = 'false';
        currentTaskElement.style.color = 'black';
        currentTaskElement.style.textDecoration = 'none';
        saveTasks();
        closeEditModal();
    }

    function handleDelete() {
        if (!currentTaskElement) return;

        showConfirmationModal('Are you sure you want to delete this task?', () => {
            currentTaskElement.remove();
            saveTasks();
            closeEditModal();
        });
    }

    function closeEditModal() {
        editModal.style.display = 'none';
        currentTaskElement = null;
    }

    deleteAllTasksButton.addEventListener('click', () => {
        showConfirmationModal('Are you sure you want to delete all tasks?', () => {
            taskList.innerHTML = '';
            localStorage.removeItem('tasks');
        });
    });

    themeSelect.addEventListener('change', () => {
        document.body.className = themeSelect.value;
        localStorage.setItem('theme', themeSelect.value);
    });

    settingsButton.addEventListener('click', () => {
        settingsPanel.style.display = settingsPanel.style.display === 'block' ? 'none' : 'block';
    });

    closeModal.addEventListener('click', closeEditModal);

    // Initialize
    loadTasks();
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.body.className = savedTheme;
        themeSelect.value = savedTheme;
    }
});
