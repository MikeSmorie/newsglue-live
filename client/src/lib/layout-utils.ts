// Layout utility functions and constants

export const defaultSpacing = {
  sections: {
    paddingTop: '3rem',
    paddingBottom: '3rem',
    marginBottom: '3rem'
  },
  headers: {
    paddingTop: '1.5rem',
    paddingBottom: '1rem'
  },
  content: {
    paddingLeft: '2rem',
    paddingRight: '2rem',
    marginBottom: '1rem'
  }
};

export const textStyles = {
  explanatory: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: 'normal',
    fontSize: '1.125rem',
    color: '#333333',  // Darker gray for easier reading
    lineHeight: '1.8',
    marginBottom: '1.5rem'
  },
  heading: {
    h1: {
      fontFamily: 'Poppins, sans-serif',
      fontWeight: 'bold',
      fontSize: '2.5rem',
      color: '#007BFF',
      marginBottom: '1.5rem'
    },
    h2: {
      fontFamily: 'Poppins, sans-serif',
      fontWeight: 'bold',
      fontSize: '2rem',
      color: '#007BFF',
      marginBottom: '1.5rem'
    },
    h3: {
      fontFamily: 'Poppins, sans-serif',
      fontWeight: 'bold',
      fontSize: '1.75rem',
      color: '#007BFF',
      marginBottom: '1.25rem'
    }
  }
};

export const iconStyles = {
  icon: {
    color: '#007BFF',  // NewsBlue for icons
    size: '2rem',
    marginRight: '0.5rem'
  },
  iconButton: {
    backgroundColor: '#F9FAFB',  // Light background for icon buttons
    padding: '1rem',
    borderRadius: '5px',
    border: '2px solid #007BFF',
    hover: {
      backgroundColor: '#E0E0E0'  // Light gray on hover
    }
  }
};

// These styles can be applied inline or used within CSS-in-JS solutions
export const getLayoutStyles = () => {
  return {
    section: {
      paddingTop: defaultSpacing.sections.paddingTop,
      paddingBottom: defaultSpacing.sections.paddingBottom,
      marginBottom: defaultSpacing.sections.marginBottom,
    },
    header: {
      paddingTop: defaultSpacing.headers.paddingTop,
      paddingBottom: defaultSpacing.headers.paddingBottom,
    },
    content: {
      paddingLeft: defaultSpacing.content.paddingLeft,
      paddingRight: defaultSpacing.content.paddingRight,
      marginBottom: defaultSpacing.content.marginBottom,
    }
  };
};

// Get text styling for different content types
export const getTextStyles = () => {
  return {
    explanatory: textStyles.explanatory,
    heading: textStyles.heading
  };
};

// Get icon styling for consistent icon appearance
export const getIconStyles = () => {
  return {
    icon: iconStyles.icon,
    iconButton: iconStyles.iconButton
  };
};