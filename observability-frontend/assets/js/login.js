/**
 * Login Page Script
 * Handles login form submission and authentication
 */

(function() {
    'use strict';

    const authService = AuthService.getInstance();

    // DOM Elements
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const rememberMeCheckbox = document.getElementById('rememberMe');
    const loginBtn = document.getElementById('loginBtn');
    const loginAlert = document.getElementById('loginAlert');
    const emailError = document.getElementById('emailError');
    const passwordError = document.getElementById('passwordError');

    /**
     * Initialize the login page
     */
    function init() {
        console.log('[Login] Initializing login page...');

        // Check if already authenticated
        if (authService.isAuthenticated()) {
            console.log('[Login] User already authenticated, redirecting to dashboard');
            window.location.href = 'index.html';
            return;
        }

        // Setup form handlers
        setupFormHandlers();

        // Focus on email input
        emailInput.focus();
    }

    /**
     * Setup form event handlers
     */
    function setupFormHandlers() {
        loginForm.addEventListener('submit', handleLogin);

        // Clear errors on input
        emailInput.addEventListener('input', () => {
            clearFieldError(emailInput, emailError);
            hideAlert();
        });

        passwordInput.addEventListener('input', () => {
            clearFieldError(passwordInput, passwordError);
            hideAlert();
        });

        // Handle Enter key
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleLogin(e);
            }
        });
    }

    /**
     * Handle login form submission
     */
    async function handleLogin(e) {
        e.preventDefault();

        // Clear previous errors
        hideAlert();
        clearFieldError(emailInput, emailError);
        clearFieldError(passwordInput, passwordError);

        // Validate inputs
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        const rememberMe = rememberMeCheckbox.checked;

        let hasError = false;

        if (!email) {
            showFieldError(emailInput, emailError, 'Email is required');
            hasError = true;
        } else if (!isValidEmail(email)) {
            showFieldError(emailInput, emailError, 'Please enter a valid email');
            hasError = true;
        }

        if (!password) {
            showFieldError(passwordInput, passwordError, 'Password is required');
            hasError = true;
        }

        if (hasError) {
            return;
        }

        // Show loading state
        setLoading(true);

        try {
            // Authenticate user
            const result = await authService.authenticate(email, password);

            if (result.success) {
                // Save session with full auth data
                authService.saveSession(result.session, result.user, result, rememberMe);

                // Show success message
                showAlert('Login successful! Redirecting...', 'success');

                // Redirect to dashboard
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 500);
            } else {
                // Show error
                showAlert(result.error || 'Authentication failed', 'error');
                passwordInput.value = '';
                passwordInput.focus();
            }
        } catch (error) {
            console.error('[Login] Error during authentication:', error);
            showAlert('An error occurred. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    }

    /**
     * Validate email format
     */
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Show field error
     */
    function showFieldError(input, errorEl, message) {
        input.classList.add('error');
        errorEl.textContent = message;
        errorEl.classList.add('visible');
    }

    /**
     * Clear field error
     */
    function clearFieldError(input, errorEl) {
        input.classList.remove('error');
        errorEl.classList.remove('visible');
    }

    /**
     * Show alert message
     */
    function showAlert(message, type) {
        loginAlert.textContent = message;
        loginAlert.className = 'login-alert ' + type;
    }

    /**
     * Hide alert message
     */
    function hideAlert() {
        loginAlert.className = 'login-alert';
        loginAlert.textContent = '';
    }

    /**
     * Set loading state
     */
    function setLoading(loading) {
        if (loading) {
            loginBtn.disabled = true;
            loginBtn.innerHTML = '<span class="loading-spinner"></span>Signing in...';
        } else {
            loginBtn.disabled = false;
            loginBtn.innerHTML = 'Sign In';
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

