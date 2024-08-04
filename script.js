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
        // Sort tasks by reminder time in ascending order
        tasks.sort((a, b) => a.reminderTime - b.reminderTime);
        tasks.forEach(task => {
            const li = createTaskElement(task.text, task.reminderTime, task.completed, task.creationTime);
            taskList.appendChild(li);
        });
        function scheduleTopTaskNotifications() {
            // Clear existing notification intervals
            notificationIntervals.forEach((interval, taskElement) => clearInterval(interval));
            notificationIntervals.clear();
        
            // Get the first task in the sorted list
            const topTask = taskList.querySelector('li:not([data-completed="true"])');
            if (!topTask) return; // Exit if no pending tasks
        
            const reminderTime = parseInt(topTask.dataset.reminderTime);
            const taskText = topTask.firstChild.textContent;
        
            scheduleReminder(taskText, reminderTime, topTask, topTask.querySelector('span'));
            scheduleNotifications(taskText, reminderTime, topTask);
        }
        
    }
    
    function addNewTask(taskText, reminderTime) {
        const creationTime = new Date().toISOString();
        const li = createTaskElement(taskText, reminderTime, false, creationTime);
        taskList.appendChild(li);
        if (reminderTime > new Date().getTime()) {
            scheduleReminder(taskText, reminderTime, li, li.querySelector('span'));
            scheduleNotifications(taskText, reminderTime, li);
        }
        saveTasks(); // Save the task to localStorage
    }
    
    addTaskButton.addEventListener('click', () => {
        const taskText = taskInput.value;
        const reminderTime = new Date(taskReminder.value).getTime();
        if (taskText && !isNaN(reminderTime)) {
            addNewTask(taskText, reminderTime);
            taskInput.value = ''; // Clear input field
            taskReminder.value = ''; // Clear reminder field
        } else {
            alert('Please enter valid task details.');
        }
    });
    
    // Ensure to clear and re-sort the task list before re-adding tasks
    function refreshTaskList() {
        taskList.innerHTML = ''; // Clear the current list
        loadTasks(); // Reload and sort tasks
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
                clearInterval(reminderIntervals.get(taskElement));
                reminderIntervals.delete(taskElement);
                return;
            }
    
            const currentTime = new Date().getTime();
            const updatedRemainingTime = reminderTime - currentTime;
    
            if (updatedRemainingTime <= 0) {
                if (!notificationsSent.has(taskElement)) {
                    if (taskElement.dataset.completed === 'true') {
                        showNotification('Task Reminder', `Task "${taskText}" is completed.`);
                    } else {
                        showNotification('Task Reminder', `Task "${taskText}" is overdue and marked as "Not Completed".`);
                    }
                    notificationsSent.set(taskElement, true);
                }
    
                taskElement.style.textDecoration = 'line-through';
                timeElement.innerHTML = 'Reminder time reached!';
    
                clearInterval(reminderIntervals.get(taskElement));
                reminderIntervals.delete(taskElement);
                scheduleTopTaskNotifications(); // Update notifications for the next top task
                return;
            }
    
            if (updatedRemainingTime <= alertThreshold && !notificationsSent.has(taskElement)) {
                if (taskElement.dataset.completed === 'true') {
                    showNotification('Task Reminder', `Task "${taskText}" is due in 3 minutes and is marked as completed.`);
                } else {
                    showNotification('Task Reminder', `Task "${taskText}" is due in 3 minutes and is marked as not completed.`);
                }
                notificationsSent.set(taskElement, true);
            }
    
            timeElement.innerHTML = `Time left: ${formatTime(updatedRemainingTime)}`;
        };
    
        if (remainingTime > 0) {
            updateTime();
            const intervalId = setInterval(updateTime, 1000);
            reminderIntervals.set(taskElement, intervalId);
        } else {
            timeElement.innerHTML = 'Reminder time has passed.';
            // Immediate notification for overdue tasks
            if (!notificationsSent.has(taskElement)) {
                showNotification('Task Reminder', `Task "${taskText}" is overdue and needs attention.`);
                notificationsSent.set(taskElement, true);
            }
        }
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
    
    
    function scheduleNotifications(taskText, reminderTime, taskElement) {
        const notifyInterval = 5 * 60 * 1000; // 5 minutes in milliseconds
    
        const notify = () => {
            if (taskElement.dataset.completed === 'true') {
                clearInterval(notificationIntervals.get(taskElement));
                notificationIntervals.delete(taskElement);
                return;
            }
    
            const now = new Date().getTime();
            if (reminderTime > now) {
                showNotification('Task Reminder', `Task "${taskText}" is still incomplete. Remember to complete it!`);
            }
        };
    
        // Notify immediately if the task is overdue
        notify();
    
        const intervalId = setInterval(notify, notifyInterval);
        notificationIntervals.set(taskElement, intervalId);
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
    
        const formattedCreationTime = new Date(creationTime).toLocaleString();
    
        if (completed) {
            li.style.textDecoration = 'line-through';
            timeSpan.textContent = `Completed - Created at: ${formattedCreationTime}`;
        } else {
            const remainingTime = reminderTime - new Date().getTime();
            if (remainingTime > 0) {
                timeSpan.innerHTML = `Time left: ${formatTime(remainingTime)} - Created at: ${formattedCreationTime}`;
            } else {
                timeSpan.innerHTML = `Reminder time has passed - Created at: ${formattedCreationTime}`;
            }
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
    
        const taskName = currentTaskElement.firstChild.textContent;
        document.getElementById('editTaskNameDisplay').textContent = taskName;

        const reminderTime = new Date(parseInt(currentTaskElement.dataset.reminderTime));
        const formattedReminderTime = reminderTime.toLocaleString();
        document.getElementById('editReminderTimeDisplay').textContent = formattedReminderTime;

        const creationTime = new Date(currentTaskElement.dataset.creationTime).toLocaleString();
        document.getElementById('editCreationTime').textContent = `Created at: ${creationTime}`;
        
        editModal.style.display = 'block';
    
        // Attach event listeners to buttons
        completeBtn.onclick = () => handleComplete();
        notCompleteBtn.onclick = () => handleNotComplete();
        resetBtn.onclick = () => handleReset();
        deleteBtn.onclick = () => handleDelete();
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
        if (updatedRemainingTime > 0) {
            scheduleReminder(currentTaskElement.firstChild.textContent, newReminderTimestamp, currentTaskElement, currentTaskElement.querySelector('span'));
        } else {
            currentTaskElement.querySelector('span').innerHTML = 'Reminder time has passed.';
        }
        scheduleNotifications(currentTaskElement.firstChild.textContent, newReminderTimestamp, currentTaskElement);

        saveTasks(); // Save the updated state to localStorage
        closeEditModal(); // Close the edit menu after resetting
    }

    function handleComplete() {
        if (!currentTaskElement) return;

        currentTaskElement.style.textDecoration = 'line-through';
        currentTaskElement.style.color = '';
        currentTaskElement.dataset.completed = 'true';
        currentTaskElement.querySelector('span').innerHTML = '<b>Completed</b> - Created at: ' + new Date(currentTaskElement.dataset.creationTime).toLocaleString();
        saveTasks(); // Save the state to localStorage
        clearInterval(reminderIntervals.get(currentTaskElement)); // Stop the reminder
        clearInterval(notificationIntervals.get(currentTaskElement)); // Stop notifications
        reminderIntervals.delete(currentTaskElement);
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
            if (reminderTime > new Date().getTime()) {
                scheduleReminder(taskText, reminderTime, li, li.querySelector('span'));
                scheduleNotifications(taskText, reminderTime, li);
            }
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
