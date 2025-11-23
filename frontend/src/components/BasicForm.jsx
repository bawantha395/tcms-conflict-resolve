import React from 'react';
import { Formik, Form } from 'formik';

const BasicForm = ({ initialValues, validationSchema, onSubmit, children }) => {
  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={onSubmit}
      validateOnChange={true}
      validateOnBlur={true}
    >
      {({ errors, touched, handleChange, values, setFieldValue }) => (
        <Form className='flex flex-col w-full space-y-4'>
          {/* Children will be the form fields and buttons */}
          {children({ errors, touched, handleChange, values, setFieldValue })}
        </Form>
      )}
    </Formik>
  );
};

export default BasicForm;