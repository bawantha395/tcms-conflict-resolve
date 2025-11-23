// Utility script to initialize sample student cards for testing

import { createCard } from './cardUtils';

/**
 * Initialize sample student cards for testing
 * This function creates sample cards for existing students and classes
 */
export const initializeSampleCards = () => {
  try {
    // Get existing students and classes
    const storedStudents = localStorage.getItem('students');
    const storedClasses = localStorage.getItem('classes');
    
    if (!storedStudents || !storedClasses) {
      console.log('No students or classes found. Please create some first.');
      return;
    }
    
    const students = JSON.parse(storedStudents);
    const classes = JSON.parse(storedClasses);
    
    if (students.length === 0 || classes.length === 0) {
      console.log('No students or classes available for card creation.');
      return;
    }
    
    // Sample card configurations
    const sampleCards = [
      {
        studentId: students[0]?.studentId || '99985570',
        classId: classes[0]?.id,
        cardType: 'free',
        reason: 'Scholarship - Academic Excellence',
        validFrom: new Date().toISOString().split('T')[0],
        validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      },
      {
        studentId: students[1]?.studentId || '99965474',
        classId: classes[1]?.id,
        cardType: 'half',
        reason: 'Family Discount - Multiple siblings enrolled',
        validFrom: new Date().toISOString().split('T')[0],
        validUntil: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      },
      {
        studentId: students[2]?.studentId || '99935041',
        classId: classes[0]?.id,
        cardType: 'free',
        reason: 'Merit-based Scholarship',
        validFrom: new Date().toISOString().split('T')[0],
        validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      },
    ];
    
    // Create cards
    let createdCount = 0;
    sampleCards.forEach(cardConfig => {
      if (cardConfig.studentId && cardConfig.classId) {
        const success = createCard(cardConfig);
        if (success) {
          createdCount++;
          console.log(`Created ${cardConfig.cardType} card for student ${cardConfig.studentId} in class ${cardConfig.classId}`);
        }
      }
    });
    
    console.log(`Successfully created ${createdCount} sample cards.`);
    
    // Show current cards
    const storedCards = localStorage.getItem('studentCards');
    if (storedCards) {
      const cards = JSON.parse(storedCards);
      console.log('Current cards in system:', cards);
    }
    
  } catch (error) {
    console.error('Error initializing sample cards:', error);
  }
};

/**
 * Clear all student cards (for testing)
 */
export const clearAllCards = () => {
  try {
    localStorage.removeItem('studentCards');
    console.log('All student cards cleared.');
  } catch (error) {
    console.error('Error clearing cards:', error);
  }
};

/**
 * Get card statistics
 */
export const getCardStats = () => {
  try {
    const storedCards = localStorage.getItem('studentCards');
    if (!storedCards) {
      console.log('No cards found.');
      return;
    }
    
    const cards = JSON.parse(storedCards);
    
    const stats = {
      total: cards.length,
      byType: {
        free: cards.filter(c => c.cardType === 'free').length,
        half: cards.filter(c => c.cardType === 'half').length,
      },
      byStatus: {
        active: cards.filter(c => c.isActive).length,
        inactive: cards.filter(c => !c.isActive).length,
      },
      byValidity: {
        valid: cards.filter(c => {
          const today = new Date().toISOString().split('T')[0];
          return c.validUntil >= today;
        }).length,
        expired: cards.filter(c => {
          const today = new Date().toISOString().split('T')[0];
          return c.validUntil < today;
        }).length,
      }
    };
    
    console.log('Card Statistics:', stats);
    return stats;
    
  } catch (error) {
    console.error('Error getting card stats:', error);
  }
};

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.initializeSampleCards = initializeSampleCards;
  window.clearAllCards = clearAllCards;
  window.getCardStats = getCardStats;
} 