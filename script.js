document.addEventListener('DOMContentLoaded', () => {
    const addTaskButton = document.getElementById('addTaskButton');
    const taskInput = document.getElementById('taskInput');
    const taskReminder = document.getElementById('taskReminder');
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

    let reminderIntervals = new Map();
    let currentTaskElement = null;

    function loadTasks() {
        const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        tasks.forEach(task => {
            const li = createTaskElement(task.text, task.reminderTime, task.completed, task.creationTime);
            taskList.appendChild(li);
            if (task.reminderTime > new Date().getTime()) {
                scheduleReminder(task.text, task.reminderTime, li, li.querySelector('span'));
            }
        });
        sortTasks();
    }

    function addNewTask(taskText, reminderTime) {
        const creationTime = new Date().toISOString();
        const li = createTaskElement(taskText, reminderTime, false, creationTime);
        taskList.appendChild(li);
        if (reminderTime > new Date().getTime()) {
            scheduleReminder(taskText, reminderTime, li, li.querySelector('span'));
        }
        saveTasks();
        sortTasks();
    }

    addTaskButton.addEventListener('click', () => {
        const taskText = taskInput.value;
        const reminderTime = new Date(taskReminder.value).getTime();
        if (taskText && !isNaN(reminderTime)) {
            addNewTask(taskText, reminderTime);
            taskInput.value = '';
            taskReminder.value = '';
        } else {
            alert('Please enter valid task details.');
        }
    });

    function saveTasks() {
        const tasks = [];
        taskList.querySelectorAll('li').forEach(li => {
            tasks.push({
                text: li.firstChild.textContent,
                reminderTime: li.dataset.reminderTime,
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
        const alertThreshold = 3 * 60 * 1000;
        const now = new Date().getTime();
        const remainingTime = reminderTime - now;

        const updateTime = () => {
            if (taskElement.dataset.completed === 'true') {
                clearInterval(reminderIntervals.get(taskElement));
                reminderIntervals.delete(taskElement);
                return;
            }

            const currentTime = new Date().getTime();
            const updatedRemainingTime = reminderTime - currentTime;

            if (updatedRemainingTime <= 0) {
                taskElement.style.textDecoration = 'line-through';
                timeElement.innerHTML = 'Reminder time reached!';

                clearInterval(reminderIntervals.get(taskElement));
                reminderIntervals.delete(taskElement);
                sortTasks();
                return;
            }

            if (updatedRemainingTime <= alertThreshold) {
                timeElement.innerHTML = `Time left: ${formatTime(updatedRemainingTime)} - Reminder in 3 minutes`;
            } else {
                timeElement.innerHTML = `Time left: ${formatTime(updatedRemainingTime)}`;
            }
        };

        if (remainingTime > 0) {
            updateTime();
            const intervalId = setInterval(updateTime, 1000);
            reminderIntervals.set(taskElement, intervalId);
        } else {
            timeElement.innerHTML = 'Reminder time has passed.';
        }
    }

    function createTaskElement(taskText, reminderTime, completed = false, creationTime) {
        const li = document.createElement('li');
        li.textContent = taskText;
        li.dataset.reminderTime = reminderTime;
        li.dataset.completed = completed;
        li.dataset.creationTime = creationTime;

        const span = document.createElement('span');
        li.appendChild(span);
        li.style.color = completed ? 'green' : 'black';
        li.style.textDecoration = completed ? 'line-through' : 'none';

        li.addEventListener('click', () => {
            currentTaskElement = li;
            openEditModal();
        });

        return li;
    }

    function openEditModal() {
        if (!currentTaskElement) return;

        document.getElementById('editTaskNameDisplay').textContent = currentTaskElement.firstChild.textContent;
        document.getElementById('editReminderTimeDisplay').textContent = `Reminder Time: ${currentTaskElement.dataset.reminderTime ? new Date(parseInt(currentTaskElement.dataset.reminderTime)).toLocaleString() : 'None'}`;
        document.getElementById('editCreationTime').textContent = `Created at: ${new Date(currentTaskElement.dataset.creationTime).toLocaleString()}`;
        document.getElementById('editModal').style.display = 'block';

        resetBtn.onclick = handleResetReminder;
        completeBtn.onclick = handleComplete;
        notCompleteBtn.onclick = handleNotComplete;
        deleteBtn.onclick = handleDelete;
    }

    function handleResetReminder() {
        if (!currentTaskElement) return;

        const currentReminderTime = currentTaskElement.dataset.reminderTime 
            ? new Date(parseInt(currentTaskElement.dataset.reminderTime)).toISOString().slice(0, 16) 
            : '';

        const newReminderTime = prompt('Enter new reminder time (format: YYYY-MM-DDTHH:MM):', currentReminderTime);
        if (!newReminderTime) return;

        const newReminderTimestamp = new Date(newReminderTime).getTime();
        if (isNaN(newReminderTimestamp) || newReminderTimestamp < Date.now()) {
            alert('Invalid date or time. Please enter a valid future date and time.');
            return;
        }

        const now = new Date().getTime();
        const updatedRemainingTime = newReminderTimestamp - now;

        currentTaskElement.dataset.reminderTime = newReminderTimestamp;
        currentTaskElement.querySelector('span').innerHTML = `Time left: ${formatTime(updatedRemainingTime)}`;

        currentTaskElement.style.textDecoration = 'none';
        currentTaskElement.style.color = '';
        currentTaskElement.dataset.completed = 'false';

        clearInterval(reminderIntervals.get(currentTaskElement));
        reminderIntervals.delete(currentTaskElement);

        if (updatedRemainingTime > 0) {
            scheduleReminder(currentTaskElement.firstChild.textContent, newReminderTimestamp, currentTaskElement, currentTaskElement.querySelector('span'));
        } else {
            currentTaskElement.querySelector('span').innerHTML = 'Reminder time has passed.';
        }

        saveTasks();
        closeEditModal();
    }

    function handleComplete() {
        if (!currentTaskElement) return;

        currentTaskElement.style.textDecoration = 'line-through';
        currentTaskElement.style.color = '';
        currentTaskElement.dataset.completed = 'true';
        currentTaskElement.querySelector('span').innerHTML = '<b>Completed</b> - Created at: ' + new Date(currentTaskElement.dataset.creationTime).toLocaleString();
        saveTasks();
        clearInterval(reminderIntervals.get(currentTaskElement));
        reminderIntervals.delete(currentTaskElement);
        checkAndMoveExpiredTasks();
        sortTasks();
        closeEditModal();
    }

    function handleNotComplete() {
        if (!currentTaskElement) return;

        clearInterval(reminderIntervals.get(currentTaskElement));
        reminderIntervals.delete(currentTaskElement);

        currentTaskElement.style.textDecoration = 'none';
        currentTaskElement.style.color = 'red';
        currentTaskElement.dataset.completed = 'false';
        currentTaskElement.querySelector('span').innerHTML = '<b>Not Completed</b> - Created at: ' + new Date(currentTaskElement.dataset.creationTime).toLocaleString();

        saveTasks();
        closeEditModal();
    }

    function handleDelete() {
        if (!currentTaskElement) return;

        if (confirm('Are you sure you want to delete this task?')) {
            taskList.removeChild(currentTaskElement);
            clearInterval(reminderIntervals.get(currentTaskElement));
            reminderIntervals.delete(currentTaskElement);
            saveTasks();
            closeEditModal();
        }
    }

    function closeEditModal() {
        editModal.style.display = 'none';
        currentTaskElement = null;
    }

    function checkAndMoveExpiredTasks() {
        const now = new Date().getTime();
        const tasks = Array.from(taskList.querySelectorAll('li'));
        tasks.forEach(li => {
            const reminderTime = parseInt(li.dataset.reminderTime, 10);
            if (reminderTime <= now) {
                taskList.prepend(li);
                li.querySelector('span').innerHTML = 'Reminder time has passed.';
            }
        });
    }

    function sortTasks() {
        const tasks = Array.from(taskList.querySelectorAll('li'));
        tasks.sort((a, b) => {
            const reminderA = parseInt(a.dataset.reminderTime, 10);
            const reminderB = parseInt(b.dataset.reminderTime, 10);
            return reminderA - reminderB;
        });
        tasks.forEach(task => taskList.appendChild(task));
    }

    setInterval(checkAndMoveExpiredTasks, 60000);

    closeModal.onclick = closeEditModal;

    window.onclick = (event) => {
        if (event.target === editModal) {
            closeEditModal();
        }
    };

    document.addEventListener('keydown', (event) => {
        if (event.ctrlKey && event.key === 'e') {
            if (currentTaskElement) {
                openEditModal();
            }
        }
    });

    settingsButton.addEventListener('click', () => {
        settingsPanel.classList.toggle('hidden');
    });

    deleteAllTasksButton.addEventListener('click', () => {
        if (confirm('Are you sure you want to delete all tasks? This action cannot be undone.')) {
            taskList.innerHTML = '';
            localStorage.removeItem('tasks');
            reminderIntervals.forEach(intervalId => clearInterval(intervalId));
            reminderIntervals.clear();
        }
    });

    function applyTheme(theme) {
        document.body.className = theme;
        localStorage.setItem('theme', theme);
    }

    const savedTheme = localStorage.getItem('theme') || 'default-theme';
    applyTheme(savedTheme);
    themeSelect.value = savedTheme;

    themeSelect.addEventListener('change', () => {
        applyTheme(themeSelect.value);
    });

    loadTasks();
});
