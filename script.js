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

    let reminderIntervals = new Map();
    let notificationIntervals = new Map();
    let notificationsSent = new Map(); // Track if notifications have been sent
    let currentTaskElement = null; // Track the currently edited task

    function loadTasks() {
        const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        tasks.forEach(task => {
            const li = createTaskElement(task.text, task.reminderTime, task.completed, task.creationTime);
            taskList.appendChild(li);
            if (!task.completed) {
                scheduleReminder(task.text, task.reminderTime, li, li.querySelector('span'));
                scheduleNotifications(task.text, task.reminderTime, li);
            }
        });
    }

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

    function showNotification(title, body) {
        if (Notification.permission === 'granted') {
            new Notification(title, { body });
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    new Notification(title, { body });
                }
            });
        }
    }

    function scheduleReminder(taskText, reminderTime, taskElement, timeElement) {
        const alertThreshold = 3 * 60 * 1000; // 3 minutes in milliseconds
        const now = new Date().getTime();
        const remainingTime = reminderTime - now;

        const updateTime = () => {
            if (taskElement.dataset.completed === 'true') {
                // Stop updating time for completed tasks
                clearInterval(reminderIntervals.get(taskElement));
                reminderIntervals.delete(taskElement);
                return;
            }

            const currentTime = new Date().getTime();
            const updatedRemainingTime = reminderTime - currentTime;

            if (updatedRemainingTime <= 0) {
                // Notify user if not done yet
                if (!notificationsSent.has(taskElement)) {
                    if (taskElement.dataset.completed === 'true') {
                        showNotification('Task Reminder', `Task "${taskText}" is completed.`);
                    } else {
                        showNotification('Task Reminder', `Task "${taskText}" is overdue and marked as "Not Completed".`);
                    }
                    notificationsSent.set(taskElement, true); // Mark notification as sent
                }

                taskElement.style.textDecoration = 'line-through';
                timeElement.innerHTML = 'Reminder time reached!';

                clearInterval(reminderIntervals.get(taskElement));
                reminderIntervals.delete(taskElement);
                clearInterval(notificationIntervals.get(taskElement));
                notificationIntervals.delete(taskElement);
                return;
            }

            if (updatedRemainingTime <= alertThreshold && !notificationsSent.has(taskElement)) {
                if (taskElement.dataset.completed === 'true') {
                    showNotification('Task Reminder', `Task "${taskText}" is due in 3 minutes and is marked as completed.`);
                } else {
                    showNotification('Task Reminder', `Task "${taskText}" is due in 3 minutes and is marked as not completed.`);
                }
                notificationsSent.set(taskElement, true); // Mark notification as sent
            }

            timeElement.innerHTML = `Time left: ${formatTime(updatedRemainingTime)}`;
        };

        updateTime(); // Show initial time
        const intervalId = setInterval(updateTime, 1000);
        reminderIntervals.set(taskElement, intervalId);
    }

    function scheduleNotifications(taskText, reminderTime, taskElement) {
        const notifyInterval = 5 * 60 * 1000; // 5 minutes in milliseconds

        const notify = () => {
            if (taskElement.dataset.completed === 'true') {
                // Stop notifications for completed tasks
                clearInterval(notificationIntervals.get(taskElement));
                notificationIntervals.delete(taskElement);
                return;
            }

            const now = new Date().getTime();
            if (reminderTime > now) {
                showNotification('Task Reminder', `Task "${taskText}" is still incomplete. Remember to complete it!`);
            }
        };

        notify(); // Notify immediately
        const intervalId = setInterval(notify, notifyInterval);
        notificationIntervals.set(taskElement, intervalId);
    }

    function createTaskElement(taskText, reminderTime, completed = false, creationTime) {
        const li = document.createElement('li');
        const timeSpan = document.createElement('span');
        li.dataset.reminderTime = reminderTime;
        li.dataset.completed = completed;
        li.dataset.creationTime = creationTime;

        if (completed) {
            li.style.textDecoration = 'line-through';
            timeSpan.textContent = `Completed - Created at: ${new Date(creationTime).toLocaleString()}`;
        } else {
            const remainingTime = reminderTime - new Date().getTime();
            timeSpan.innerHTML = `Time left: ${formatTime(remainingTime)}`;
        }

        li.textContent = taskText;
        li.appendChild(timeSpan);

        const editButton = document.createElement('button');
        editButton.textContent = 'Edit';
        editButton.className = 'edit-button'; // Add class for styling
        editButton.addEventListener('click', () => {
            currentTaskElement = li;
            openEditModal();
        });

        li.appendChild(editButton);
        return li;
    }

    function openEditModal() {
        if (!currentTaskElement) return;

        editModal.style.display = 'block';

        // Attach event listeners to buttons
        completeBtn.onclick = () => handleComplete();
        notCompleteBtn.onclick = () => handleNotComplete();
        resetBtn.onclick = () => handleReset();
        deleteBtn.onclick = () => handleDelete();
    }

    function handleComplete() {
        if (!currentTaskElement) return;

        currentTaskElement.style.textDecoration = 'line-through';
        currentTaskElement.style.color = ''; // Reset color
        currentTaskElement.dataset.completed = 'true';
        currentTaskElement.querySelector('span').textContent = `Completed - Created at: ${new Date(currentTaskElement.dataset.creationTime).toLocaleString()}`;
        saveTasks(); // Save the state to localStorage
        clearInterval(notificationIntervals.get(currentTaskElement));
        notificationIntervals.delete(currentTaskElement);
        closeEditModal();
    }

    function handleNotComplete() {
        if (!currentTaskElement) return;

        currentTaskElement.style.textDecoration = 'none';
        currentTaskElement.style.color = 'red';
        currentTaskElement.dataset.completed = 'false';
        currentTaskElement.querySelector('span').innerHTML = '<b>Not Completed</b> - Created at: ' + new Date(currentTaskElement.dataset.creationTime).toLocaleString();
        saveTasks(); // Save the state to localStorage
        scheduleNotifications(currentTaskElement.firstChild.textContent, currentTaskElement.dataset.reminderTime, currentTaskElement); // Reschedule notifications
        closeEditModal();
    }

    function handleReset() {
        if (!currentTaskElement) return;

        const currentReminderTime = currentTaskElement.dataset.reminderTime 
            ? new Date(parseInt(currentTaskElement.dataset.reminderTime)).toISOString().slice(0, 16) 
            : '';

        const newReminderTime = prompt('Enter new reminder time (format: YYYY-MM-DDTHH:MM):', currentReminderTime);
        if (!newReminderTime) return; // Exit if no new time is provided

        const newReminderTimestamp = new Date(newReminderTime).getTime();
        if (isNaN(newReminderTimestamp) || newReminderTimestamp < Date.now()) {
            alert('Invalid date or time. Please enter a valid future date and time.');
            return;
        }

        const now = new Date().getTime();
        const updatedRemainingTime = newReminderTimestamp - now;

        // Update the task's reminder time
        currentTaskElement.dataset.reminderTime = newReminderTimestamp;
        currentTaskElement.querySelector('span').innerHTML = `Time left: ${formatTime(updatedRemainingTime)}`;

        // Reset notificationsSent and completion status
        notificationsSent.delete(currentTaskElement);
        currentTaskElement.style.textDecoration = 'none'; // Remove strikethrough
        currentTaskElement.style.color = ''; // Reset color
        currentTaskElement.dataset.completed = 'false'; // Reset completion status

        // Clear previous intervals
        clearInterval(reminderIntervals.get(currentTaskElement));
        reminderIntervals.delete(currentTaskElement);
        clearInterval(notificationIntervals.get(currentTaskElement));
        notificationIntervals.delete(currentTaskElement);

        // Reschedule reminders and notifications with the new time
        scheduleReminder(currentTaskElement.firstChild.textContent, newReminderTimestamp, currentTaskElement, currentTaskElement.querySelector('span'));
        scheduleNotifications(currentTaskElement.firstChild.textContent, newReminderTimestamp, currentTaskElement);

        saveTasks(); // Save the updated state to localStorage
        closeEditModal(); // Close the edit menu after resetting
    }

    function handleDelete() {
        if (!currentTaskElement) return;

        // Show confirmation dialog
        if (confirm('Are you sure you want to delete this task?')) {
            taskList.removeChild(currentTaskElement);
            clearInterval(reminderIntervals.get(currentTaskElement));
            reminderIntervals.delete(currentTaskElement);
            clearInterval(notificationIntervals.get(currentTaskElement));
            notificationIntervals.delete(currentTaskElement);
            saveTasks(); // Save the state to localStorage
            closeEditModal();
        }
    }

    function closeEditModal() {
        editModal.style.display = 'none';
        currentTaskElement = null;
    }

    addTaskButton.addEventListener('click', () => {
        const taskText = taskInput.value;
        const reminderTime = new Date(taskReminder.value).getTime();
        const creationTime = new Date().toISOString();
        if (taskText && !isNaN(reminderTime)) {
            const li = createTaskElement(taskText, reminderTime, false, creationTime);
            taskList.appendChild(li);
            scheduleReminder(taskText, reminderTime, li, li.querySelector('span'));
            scheduleNotifications(taskText, reminderTime, li);
            saveTasks(); // Save the task to localStorage
            taskInput.value = ''; // Clear input field
            taskReminder.value = ''; // Clear reminder field
        } else {
            alert('Please enter valid task details.');
        }
    });

    closeModal.onclick = closeEditModal;

    window.onclick = (event) => {
        if (event.target === editModal) {
            closeEditModal();
        }
    };

    loadTasks(); // Load tasks on page load
});
