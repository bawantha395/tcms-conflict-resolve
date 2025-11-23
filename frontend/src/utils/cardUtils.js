// Utility functions for student card management

/**
 * Get student's card for a specific class
 * @param {string} studentId - Student ID
 * @param {string} classId - Class ID
 * @returns {Object|null} - Card object or null if not found
 */
export const getStudentCard = (studentId, classId) => {
  try {
    const storedCards = localStorage.getItem('studentCards');
    if (!storedCards) return null;
    
    const cards = JSON.parse(storedCards);
    return cards.find(card => 
      card.studentId === studentId && 
      card.classId === classId && 
      card.isActive
    );
  } catch (error) {
    console.error('Error getting student card:', error);
    return null;
  }
};

/**
 * Check if a card is valid (not expired)
 * @param {Object} card - Card object
 * @returns {Object} - { isValid: boolean, reason: string }
 */
export const isCardValid = (card) => {
  if (!card) {
    return { isValid: false, reason: 'No card found' };
  }

  const today = new Date().toISOString().split('T')[0];
  
  // Check if card is expired
  if (card.validUntil < today) {
    return { isValid: false, reason: 'Card expired' };
  }
  
  return { isValid: true, reason: 'Card is valid' };
};

/**
 * Calculate fee based on card type
 * @param {number} baseFee - Original class fee
 * @param {string} cardType - 'free' or 'half'
 * @returns {number} - Calculated fee
 */
export const calculateFeeWithCard = (baseFee, cardType) => {
  switch (cardType) {
    case 'free':
      return 0;
    case 'half':
      return Math.round(baseFee * 0.5);
    default:
      return baseFee; // No card or invalid card type
  }
};

/**
 * Get card discount percentage
 * @param {string} cardType - 'free' or 'half'
 * @returns {number} - Discount percentage (0-100)
 */
export const getCardDiscount = (cardType) => {
  switch (cardType) {
    case 'free':
      return 100;
    case 'half':
      return 50;
    default:
      return 0; // No card or invalid card type
  }
};



/**
 * Get all cards for a student
 * @param {string} studentId - Student ID
 * @returns {Array} - Array of card objects
 */
export const getStudentCards = (studentId) => {
  try {
    const storedCards = localStorage.getItem('studentCards');
    if (!storedCards) return [];
    
    const cards = JSON.parse(storedCards);
    return cards.filter(card => card.studentId === studentId);
  } catch (error) {
    console.error('Error getting student cards:', error);
    return [];
  }
};

/**
 * Get all cards for a class
 * @param {string} classId - Class ID
 * @returns {Array} - Array of card objects
 */
export const getClassCards = (classId) => {
  try {
    const storedCards = localStorage.getItem('studentCards');
    if (!storedCards) return [];
    
    const cards = JSON.parse(storedCards);
    return cards.filter(card => card.classId === classId);
  } catch (error) {
    console.error('Error getting class cards:', error);
    return [];
  }
};

/**
 * Get card type display information
 * @param {string} cardType - 'free' or 'half'
 * @returns {Object} - Card type info with label, description, and color
 */
export const getCardTypeInfo = (cardType) => {
  const cardTypes = {
    free: {
      label: 'Free Card',
      description: 'Student can attend class for free',
      color: 'bg-green-100 text-green-800',
      icon: '🎫'
    },
    half: {
      label: 'Half Card',
      description: 'Student pays 50% of the class fee',
      color: 'bg-yellow-100 text-yellow-800',
      icon: '🎫'
    }
  };
  
  return cardTypes[cardType] || cardTypes.free;
};

/**
 * Get card status information
 * @param {Object} card - Card object
 * @returns {Object} - Status info with status, label, and color
 */
export const getCardStatus = (card) => {
  if (!card) {
    return { status: 'none', label: 'No Card', color: 'bg-gray-100 text-gray-800' };
  }

  const today = new Date().toISOString().split('T')[0];
  const isExpired = card.validUntil < today;
  
  if (isExpired) {
    return { status: 'expired', label: 'Expired', color: 'bg-red-100 text-red-800' };
  }
  return { status: 'active', label: 'Active', color: 'bg-green-100 text-green-800' };
};

/**
 * Create a new card
 * @param {Object} cardData - Card data
 * @returns {boolean} - Success status
 */
export const createCard = (cardData) => {
  try {
    const storedCards = localStorage.getItem('studentCards');
    const cards = storedCards ? JSON.parse(storedCards) : [];
    
    const newCard = {
      id: `${cardData.studentId}_${cardData.classId}_${Date.now()}`,
      ...cardData,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    cards.push(newCard);
    localStorage.setItem('studentCards', JSON.stringify(cards));
    return true;
  } catch (error) {
    console.error('Error creating card:', error);
    return false;
  }
};

/**
 * Update an existing card
 * @param {string} cardId - Card ID
 * @param {Object} updates - Card updates
 * @returns {boolean} - Success status
 */
export const updateCard = (cardId, updates) => {
  try {
    const storedCards = localStorage.getItem('studentCards');
    if (!storedCards) return false;
    
    const cards = JSON.parse(storedCards);
    const cardIndex = cards.findIndex(card => card.id === cardId);
    
    if (cardIndex === -1) return false;
    
    cards[cardIndex] = {
      ...cards[cardIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    
    localStorage.setItem('studentCards', JSON.stringify(cards));
    return true;
  } catch (error) {
    console.error('Error updating card:', error);
    return false;
  }
};

/**
 * Delete a card
 * @param {string} cardId - Card ID
 * @returns {boolean} - Success status
 */
export const deleteCard = (cardId) => {
  try {
    const storedCards = localStorage.getItem('studentCards');
    if (!storedCards) return false;
    
    const cards = JSON.parse(storedCards);
    const filteredCards = cards.filter(card => card.id !== cardId);
    
    localStorage.setItem('studentCards', JSON.stringify(filteredCards));
    return true;
  } catch (error) {
    console.error('Error deleting card:', error);
    return false;
  }
}; 