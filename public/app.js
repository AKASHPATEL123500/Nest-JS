/* ============================================
   STATE MANAGEMENT & AUTH SERVICE
   ============================================ */
class AuthApp {
    constructor() {
        this.currentPage = 'landing';
        this.currentUser = null;
        this.token = localStorage.getItem( 'auth_token' );
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkAuth();
        this.showPage( 'landing' );
    }

    setupEventListeners() {
        // Landing page buttons
        document.getElementById( 'btnLandingSignin' ).onclick = () => this.showPage( 'login' );
        document.getElementById( 'btnLandingSignup' ).onclick = () => this.showPage( 'signup' );

        // Login form
        document.getElementById( 'loginForm' ).onsubmit = ( e ) => {
            e.preventDefault();
            this.handleLogin();
        };

        // Signup form
        document.getElementById( 'signupForm' ).onsubmit = ( e ) => {
            e.preventDefault();
            this.handleSignup();
        };

        // Switch between login and signup
        document.getElementById( 'switchToSignup' ).onclick = ( e ) => {
            e.preventDefault();
            this.showPage( 'signup' );
        };

        document.getElementById( 'switchToLogin' ).onclick = ( e ) => {
            e.preventDefault();
            this.showPage( 'login' );
        };

        // Navigation
        document.getElementById( 'navHome' ).onclick = () => this.showPage( 'home' );
        document.getElementById( 'navProfile' ).onclick = () => this.showPage( 'profile' );
        document.getElementById( 'navLogout' ).onclick = () => this.handleLogout();

        // Home page
        document.getElementById( 'homeGoProfile' ).onclick = () => this.showPage( 'profile' );

        // Profile page
        document.getElementById( 'profileEdit' ).onclick = () => this.showMessage( 'Edit profile coming soon!' );
        document.getElementById( 'profileChangePass' ).onclick = () => this.showMessage( 'Change password coming soon!' );
        document.getElementById( 'profileLogout' ).onclick = () => this.handleLogout();
    }

    /* ============================================
       API CALLS
       ============================================ */
    async apiCall( path, method = 'GET', body = null ) {
        const opts = {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        if ( this.token ) {
            opts.headers[ 'Authorization' ] = `Bearer ${ this.token }`;
        }

        if ( body ) {
            opts.body = JSON.stringify( body );
        }

        const response = await fetch( `/auth/${ path }`, opts );
        return response.json();
    }

    async handleSignup() {
        const name = document.getElementById( 'signupName' ).value.trim();
        const email = document.getElementById( 'signupEmail' ).value.trim();
        const password = document.getElementById( 'signupPassword' ).value.trim();

        // Basic validation
        if ( !name || !email || !password ) {
            this.showError( 'signupError', 'All fields are required' );
            return;
        }

        if ( password.length < 6 ) {
            this.showError( 'signupError', 'Password must be at least 6 characters' );
            return;
        }

        try {
            this.showError( 'signupError', '' );
            const res = await this.apiCall( 'signup', 'POST', { name, email, password } );

            if ( res.error ) {
                this.showError( 'signupError', res.error );
            } else if ( res.token ) {
                this.token = res.token;
                this.currentUser = res.user;
                localStorage.setItem( 'auth_token', this.token );
                this.showSuccess( 'signupSuccess', 'Account created successfully! Redirecting...' );

                setTimeout( () => {
                    this.loadUserData();
                    this.showPage( 'home' );
                }, 1500 );
            }
        } catch ( e ) {
            this.showError( 'signupError', 'An error occurred. Please try again.' );
            console.error( e );
        }
    }

    async handleLogin() {
        const email = document.getElementById( 'loginEmail' ).value.trim();
        const password = document.getElementById( 'loginPassword' ).value.trim();

        if ( !email || !password ) {
            this.showError( 'loginError', 'Email and password are required' );
            return;
        }

        try {
            this.showError( 'loginError', '' );
            const res = await this.apiCall( 'login', 'POST', { email, password } );

            if ( res.error ) {
                this.showError( 'loginError', res.error );
            } else if ( res.token ) {
                this.token = res.token;
                this.currentUser = res.user;
                localStorage.setItem( 'auth_token', this.token );
                this.showSuccess( 'loginSuccess', 'Login successful! Redirecting...' );

                setTimeout( () => {
                    this.loadUserData();
                    this.showPage( 'home' );
                }, 1500 );
            }
        } catch ( e ) {
            this.showError( 'loginError', 'Invalid credentials' );
            console.error( e );
        }
    }

    async handleLogout() {
        try {
            await this.apiCall( 'logout', 'POST' );
        } catch ( e ) {
            console.error( e );
        } finally {
            this.token = null;
            this.currentUser = null;
            localStorage.removeItem( 'auth_token' );
            this.showPage( 'landing' );
            this.clearForm();
        }
    }

    async loadUserData() {
        try {
            const res = await this.apiCall( 'profile', 'GET' );
            if ( res.user ) {
                this.currentUser = res.user;
                this.updateUI();
            }
        } catch ( e ) {
            console.error( 'Failed to load user data', e );
        }
    }

    /* ============================================
       UI UPDATES
       ============================================ */
    updateUI() {
        if ( !this.currentUser ) return;

        // Home page
        document.getElementById( 'homeUserName' ).textContent = this.currentUser.name || 'User';
        document.getElementById( 'homeEmail' ).textContent = this.currentUser.email;
        document.getElementById( 'homeUserId' ).textContent = this.currentUser.id;

        // Profile page
        document.getElementById( 'profileName' ).textContent = this.currentUser.name || 'User';
        document.getElementById( 'profileEmail' ).textContent = this.currentUser.email;
        document.getElementById( 'detailName' ).textContent = this.currentUser.name || 'N/A';
        document.getElementById( 'detailEmail' ).textContent = this.currentUser.email;
        document.getElementById( 'detailId' ).textContent = this.currentUser.id;
    }

    showPage( pageName ) {
        // Hide all pages
        document.querySelectorAll( '.page' ).forEach( ( page ) => page.classList.remove( 'active' ) );

        // Show selected page
        const page = document.getElementById( `page-${ pageName }` );
        if ( page ) {
            page.classList.add( 'active' );
            this.currentPage = pageName;
        }

        // Update navbar visibility
        this.updateNavbar();

        // Load user data if needed
        if ( ( pageName === 'home' || pageName === 'profile' ) && this.token && !this.currentUser ) {
            this.loadUserData();
        }

        // Scroll to top
        window.scrollTo( 0, 0 );
    }

    updateNavbar() {
        const navHome = document.getElementById( 'navHome' );
        const navProfile = document.getElementById( 'navProfile' );
        const navLogout = document.getElementById( 'navLogout' );

        if ( this.token && this.currentUser ) {
            navHome.disabled = false;
            navProfile.disabled = false;
            navLogout.disabled = false;
        } else {
            navHome.disabled = true;
            navProfile.disabled = true;
            navLogout.disabled = true;
        }
    }

    showError( elementId, message ) {
        const el = document.getElementById( elementId );
        if ( message ) {
            el.textContent = message;
            el.classList.add( 'show' );
        } else {
            el.classList.remove( 'show' );
            el.textContent = '';
        }
    }

    showSuccess( elementId, message ) {
        const el = document.getElementById( elementId );
        if ( message ) {
            el.textContent = message;
            el.classList.add( 'show' );
        } else {
            el.classList.remove( 'show' );
            el.textContent = '';
        }
    }

    showMessage( message ) {
        alert( message );
    }

    clearForm() {
        document.getElementById( 'loginForm' ).reset();
        document.getElementById( 'signupForm' ).reset();
        document.getElementById( 'loginError' ).classList.remove( 'show' );
        document.getElementById( 'loginSuccess' ).classList.remove( 'show' );
        document.getElementById( 'signupError' ).classList.remove( 'show' );
        document.getElementById( 'signupSuccess' ).classList.remove( 'show' );
    }

    checkAuth() {
        if ( this.token ) {
            this.loadUserData();
        }
    }
}

/* ============================================
   INITIALIZE APP ON DOM READY
   ============================================ */
document.addEventListener( 'DOMContentLoaded', () => {
    new AuthApp();
} );
