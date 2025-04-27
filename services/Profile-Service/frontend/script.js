document.addEventListener('DOMContentLoaded', function() {
    const editBtn = document.getElementById('editProfileBtn');
    const form = document.getElementById('profileForm');
    const inputs = form.querySelectorAll('input');
    const passwordGroups = document.querySelectorAll('.password-group');
    const buttonGroup = document.querySelector('.button-group');
    const saveBtn = document.getElementById('saveBtn');
    const cancelBtn = document.getElementById('cancelBtn');

    // Store original values
    const originalValues = {};
    inputs.forEach(input => {
        originalValues[input.id] = input.value;
    });

    // Edit Profile Button Click
    editBtn.addEventListener('click', function() {
        inputs.forEach(input => {
            if (input.type !== 'password') {
                input.readOnly = false;
            }
        });
        passwordGroups.forEach(group => group.classList.remove('hidden'));
        buttonGroup.classList.remove('hidden');
        editBtn.classList.add('hidden');
    });

    // Cancel Button Click
    cancelBtn.addEventListener('click', function() {
        inputs.forEach(input => {
            if (input.type !== 'password') {
                input.value = originalValues[input.id];
                input.readOnly = true;
            } else {
                input.value = '';
            }
        });
        passwordGroups.forEach(group => group.classList.add('hidden'));
        buttonGroup.classList.add('hidden');
        editBtn.classList.remove('hidden');
    });

    // Form Submit
    document.getElementById('profileForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = {
            username: document.getElementById('username').value,
            email: document.getElementById('email').value,
            password: document.getElementById('password').value,
            first_name: document.getElementById('firstName').value,
            last_name: document.getElementById('lastName').value,
            middle_name: document.getElementById('middleName').value,
            bio: document.getElementById('bio').value,
            date_of_birth: document.getElementById('dateOfBirth').value,
            address: document.getElementById('address').value,
            profile_picture_url: '',
            banner_picture_url: ''
        };
    
        try {
            const response = await fetch('http://localhost:8080/profiles', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
    
            const data = await response.json();
            
            if (response.ok) {
                showMessage('Profile created successfully!', 'success');
                document.getElementById('profileForm').reset();
            } else {
                showMessage('Error creating profile: ' + data.error, 'error');
            }
        } catch (error) {
            showMessage('Error connecting to server: ' + error.message, 'error');
        }
    });

    function showMessage(message, type) {
        const messageDiv = document.getElementById('message');
        messageDiv.textContent = message;
        messageDiv.className = type;
        setTimeout(() => {
            messageDiv.textContent = '';
            messageDiv.className = '';
        }, 5000);
    }

    function openEditModal() {
        document.getElementById('editModal').style.display = 'block';
    }

    function closeEditModal() {
        document.getElementById('editModal').style.display = 'none';
    }

    document.getElementById('editProfileForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
    
        if (newPassword !== confirmPassword) {
            alert('Passwords do not match!');
            return;
        }
    
        try {
            const response = await fetch('http://localhost:8080/profiles/password', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    password: newPassword
                })
            });
    
            if (response.ok) {
                alert('Password updated successfully!');
                closeEditModal();
            } else {
                alert('Failed to update password');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error updating password');
        }
    });
    
    // Close modal when clicking outside
    window.onclick = function(event) {
        const modal = document.getElementById('editModal');
        if (event.target == modal) {
            closeEditModal();
        }
    }
});