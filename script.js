document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    // Simulate login interaction
    const btn = document.querySelector('.login-button');
    const originalText = btn.textContent;
    btn.textContent = 'Connecting...';
    btn.style.opacity = '0.8';
    
    setTimeout(() => {
        btn.textContent = 'Success!';
        btn.style.backgroundColor = '#10b981'; // Success green
        
        // Reset after a moment
        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.backgroundColor = '';
            btn.style.opacity = '1';
            
            // For demo purposes, we just clear the form
            document.getElementById('loginForm').reset();
        }, 2000);
    }, 1500);
});
