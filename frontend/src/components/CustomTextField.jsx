import React, { useState } from 'react';
import styled from 'styled-components';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

const InputContainer = styled.div`
  position: relative;
  width: 100%;
`;

const StyledInput = styled.input`
  width: 100%;
  padding: 12px 16px 12px 40px; /* Padding for inner icon and text, symmetrical vertical */
  font-size: 0.75rem; /* text-xs */
  border: 2px solid #1a365d;
  border-radius: 0.375rem; /* rounded-md */
  background-color: white;
  transition: box-shadow 0.2s ease-in-out, border-color 0.2s ease-in-out;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); /* shadow-sm */
  outline: none;
  line-height: 1; /* Keep line-height minimal for precise vertical control */

  &:focus {
    border-color: #1a365d;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); /* focus:shadow-md */
    outline: none;
  }

  /* Adjust padding when text is typed and label floats */
  &:not(:placeholder-shown) {
    padding-top: 12px; /* Slightly adjusted top padding */
    padding-bottom: 12px; /* Slightly adjusted bottom padding */
  }
`;

const StyledLabel = styled.label`
  position: absolute;
  left: 40px; /* Aligned with input text start, after the inner icon */
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.75rem; /* text-xs */
  font-weight: 500; /* font-medium */
  color: #a0aec0; /* text-gray-400 - default color for label when inside */
  background-color: white;
  padding: 0 4px;
  transition: all 0.2s ease-in-out;
  pointer-events: none; /* Allows clicks to pass through to the input */

  /* When input is focused or has content, float the label */
  ${StyledInput}:focus + &,
  ${StyledInput}:not(:placeholder-shown) + & {
    top: -10px; /* Move above the border */
    font-size: 0.625rem; /* text-[10px] - smaller when floated */
    color: #1a365d; /* text-[#1a365d] - primary color when floated/focused */
    transform: translateY(0); /* Reset transform */
    left: 8px; /* Adjust left position when floated to be inside border */
  }
`;

const InnerIconWrapper = styled.div`
  position: absolute;
  left: 12px; /* Position of the icon inside the input */
  top: 50%;
  transform: translateY(-50%);
  color: ${props => props.$isActive ? '#1a365d' : '#a0aec0'}; /* Dynamic color based on focus/value */
  transition: color 0.2s ease-in-out;
  display: block; /* Ensure the icon wrapper is visible */
`;

const TogglePasswordButton = styled.button`
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #a0aec0; /* text-gray-400 */
  cursor: pointer;
  background: none;
  border: none;
  padding: 0;
  &:hover {
    color: #4a5568; /* hover:text-gray-600 */
  }
`;

const ErrorText = styled.span`
  color: #ef4444; /* text-red-500 */
  font-size: 0.625rem; /* text-[10px] */
  margin-top: 4px; /* mt-1 */
`;

const CustomTextField = ({ id, name, type, value, onChange, label, icon: Icon, error, touched, isPassword, ...props }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false); 

  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className='flex flex-col'>
      <InputContainer>
        <StyledInput
          id={id}
          type={inputType}
          name={name}
          value={value}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder=" " // Crucial for styled-components floating label with peer selector
          {...props}
        />
        
        {/* The label that floats (text only) */}
        <StyledLabel htmlFor={id} $isActive={isFocused || value}>
            {label}
        </StyledLabel>

        {/* The icon that stays inside and changes color */}
        {Icon && ( // Only render if Icon prop is provided
          <InnerIconWrapper $isActive={isFocused || value}>
            <Icon />
          </InnerIconWrapper>
        )}

        {isPassword && (
          <TogglePasswordButton type='button' onClick={() => setShowPassword(!showPassword)}>
            {showPassword ? <FaEyeSlash /> : <FaEye />}
          </TogglePasswordButton>
        )}
      </InputContainer>
      {error && (
        <ErrorText>{error}</ErrorText>
      )}
    </div>
  );
};

export default CustomTextField; 