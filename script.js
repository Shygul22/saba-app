document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
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
            if (task.reminderTime > Date.now()) {
                scheduleReminder(task.text, task.reminderTime, li, li.querySelector('span'));
            }
        });
    }

    function addNewTask(taskText, taskReason, reminderTime, dueTime) {
        const creationTime = new Date().toISOString();
        const li = createTaskElement(taskText, taskReason, reminderTime, dueTime, false, creationTime);
        taskList.appendChild(li);
        if (reminderTime > Date.now()) {
            scheduleReminder(taskText, reminderTime, li, li.querySelector('span'));
        }
        saveTasks();
    }

    addTaskButton.addEventListener('click', () => {
        const taskText = taskInput.value.trim();
        const taskReason = taskReasonInput.value.trim();
        const reminderTime = parseDateTime(taskReminder.value);
        const dueTime = parseDateTime(taskDueTime.value);

        if (taskText && taskReason && reminderTime && dueTime) {
            addNewTask(taskText, taskReason, reminderTime, dueTime);
        } else {
            alert('Please enter valid task details.');
        }

        taskInput.value = '';
        taskReasonInput.value = '';
        taskReminder.value = '';
        taskDueTime.value = '';
    });

    function parseDateTime(value) {
        const dateTime = new Date(value);
        return dateTime.getTime() ? dateTime.getTime() : null;
    }

    function saveTasks() {
        const tasks = Array.from(taskList.querySelectorAll('li')).map(li => ({
            text: li.dataset.text,
            reason: li.dataset.reason,
            reminderTime: li.dataset.reminderTime,
            dueTime: li.dataset.dueTime,
            completed: li.dataset.completed === 'true',
            creationTime: li.dataset.creationTime
        }));
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }

    function formatTime(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const hour12 = hours % 12 || 12;

        return `${hour12}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} ${ampm}`;
    }

    function scheduleReminder(taskText, reminderTime, taskElement, timeElement) {
        const alertThreshold = 3 * 60 * 1000; // 3 minutes
        const dueAlertThreshold = 30 * 60 * 1000; // 30 minutes
    
        const notificationsShown = {
            reminderPassed: false,
            dueTimeApproaching: false,
            dueTimePassed: false
        };
    
        function updateTime() {
            const now = Date.now();
            const remainingTime = reminderTime - now;
            const dueTime = parseInt(taskElement.dataset.dueTime, 10);
            const remainingDueTime = dueTime - now;
    
            if (taskElement.dataset.completed === 'true') {
                clearInterval(reminderIntervals.get(taskElement));
                reminderIntervals.delete(taskElement);
                return;
            }
    
            if (remainingTime <= 0) {
                clearInterval(reminderIntervals.get(taskElement));
                reminderIntervals.delete(taskElement);
                timeElement.innerHTML = 'Reminder time has passed.';
                if (!notificationsShown.reminderPassed) {
                    showNotification('Task Reminder', {
                        body: `The reminder time for "${taskText}" has passed.`,
                        icon: 'path/to/icon.png' // Optional: Replace with an icon path
                    });
                    notificationsShown.reminderPassed = true;
                }
            } else {
                timeElement.innerHTML = remainingTime <= alertThreshold ?
                    `Reminder in ${Math.ceil(remainingTime / 60000)} minutes` :
                    `Time left: ${formatTime(remainingTime)}`;
            }
    
            if (dueTime <= now) {
                const alertElement = taskElement.querySelector('.due-alert');
                if (!notificationsShown.dueTimePassed) {
                    if (alertElement) {
                        alertElement.innerHTML = `<strong>Due time has passed! Reason: ${taskElement.dataset.reason}</strong>`;
                    } else {
                        const newAlertElement = document.createElement('div');
                        newAlertElement.className = 'due-alert';
                        newAlertElement.innerHTML = `<strong>Due time has passed! Reason: ${taskElement.dataset.reason}</strong>`;
                        taskElement.appendChild(newAlertElement);
                    }
                    showNotification('Task Due Time Passed', {
                        body: `The due time for "${taskText}" has passed. Reason: ${taskElement.dataset.reason}`,
                        icon: 'path/to/icon.png' // Optional: Replace with an icon path
                    });
                    notificationsShown.dueTimePassed = true;
                }
            } else if (remainingDueTime <= dueAlertThreshold && remainingDueTime > 0) {
                let alertElement = taskElement.querySelector('.due-alert');
                if (!alertElement) {
                    alertElement = document.createElement('div');
                    alertElement.className = 'due-alert';
                    taskElement.appendChild(alertElement);
                }
                alertElement.innerHTML = `<strong>Due time approaching in ${Math.ceil(remainingDueTime / 60000)} minutes! Reason: ${taskElement.dataset.reason}</strong>`;
                if (!notificationsShown.dueTimeApproaching) {
                    showNotification('Task Due Time Approaching', {
                        body: `The due time for "${taskText}" is approaching in ${Math.ceil(remainingDueTime / 60000)} minutes. Reason: ${taskElement.dataset.reason}`,
                        icon: 'path/to/icon.png' // Optional: Replace with an icon path
                    });
                    notificationsShown.dueTimeApproaching = true;
                }
            } else {
                const alertElement = taskElement.querySelector('.due-alert');
                if (alertElement) {
                    alertElement.remove();
                }
            }
        }
    
        requestNotificationPermission();
    
        if (reminderTime > Date.now()) {
            updateTime();
            const intervalId = setInterval(updateTime, 1000);
            reminderIntervals.set(taskElement, intervalId);
        } else {
            timeElement.innerHTML = 'Reminder time has passed.';
            if (!notificationsShown.reminderPassed) {
                showNotification('Task Reminder', {
                    body: `The reminder time for "${taskText}" has passed.`,
                    icon: 'path/to/icon.png' // Optional: Replace with an icon path
                });
                notificationsShown.reminderPassed = true;
            }
        }
    }

    function showNotification(title, options) {
        if (Notification.permission === 'granted') {
            new Notification(title, options);
        }
    }

    function requestNotificationPermission() {
        if (Notification.permission !== 'granted') {
            Notification.requestPermission();
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
        li.textContent = taskText;
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
    
        scheduleReminder(taskText, reminderTime, li, span);
    
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
        document.getElementById('editReminderTimeDisplay').textContent = `Reminder Time: ${currentTaskElement.dataset.reminderTime ? new Date(parseInt(currentTaskElement.dataset.reminderTime)).toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true }) : 'None'}`;
        document.getElementById('editCreationTime').textContent = `Created at: ${new Date(currentTaskElement.dataset.creationTime).toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true })}`;
        document.getElementById('editDueTimeDisplay').textContent = `Due Time: ${currentTaskElement.dataset.dueTime ? new Date(parseInt(currentTaskElement.dataset.dueTime)).toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true }) : 'None'}`;

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

        const newReminderTimeMs = parseDateTime(newReminderTime);

        if (taskText && taskReason && newReminderTimeMs) {
            currentTaskElement.dataset.text = taskText;
            currentTaskElement.dataset.reason = taskReason;
            currentTaskElement.dataset.reminderTime = newReminderTimeMs;
            currentTaskElement.dataset.completed = 'false';
            currentTaskElement.style.color = 'black';
            currentTaskElement.style.textDecoration = 'none';
            saveTasks();
            scheduleReminder(taskText, newReminderTimeMs, currentTaskElement, currentTaskElement.querySelector('span'));
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

    loadTasks();
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.body.className = savedTheme;
        themeSelect.value = savedTheme;
    }
});
