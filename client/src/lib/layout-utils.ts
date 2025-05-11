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