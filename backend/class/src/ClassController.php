<?php
// Set timezone for all date/time operations
date_default_timezone_set('Asia/Colombo');

require_once 'ClassModel.php';
require_once 'config.php';

class ClassController {
    private $model;

    public function getClassNameList() {
    return $this->model->getClassNameList();
    }

    public function __construct($db) {
        $this->model = new ClassModel($db);
    }

    // Create class
    public function createClass($data) {
        return $this->model->createClass($data);
    }

    // Get class by ID
    public function getClassById($id) {
        return $this->model->getClassById($id);
    }

    // Update class by ID
    public function updateClass($id, $data) {
        return $this->model->updateClass($id, $data);
    }

    // Delete class by ID
    public function deleteClass($id) {
        return $this->model->deleteClass($id);
    }

    // Get all classes
    public function getAllClasses() {
        return $this->model->getAllClasses();
    }

    // Get active classes only
    public function getActiveClasses() {
        return $this->model->getActiveClasses();
    }

    // Get classes by course type
    public function getClassesByType($courseType) {
        return $this->model->getClassesByType($courseType);
    }

    // Get classes by delivery method
    public function getClassesByDeliveryMethod($deliveryMethod) {
        return $this->model->getClassesByDeliveryMethod($deliveryMethod);
    }

    // Get classes by teacher
    public function getClassesByTeacher($teacherId) {
        return $this->model->getClassesByTeacher($teacherId);
    }

    // Get classes by stream
    public function getClassesByStream($stream) {
        return $this->model->getClassesByStream($stream);
    }

    // Session Schedule Methods
    public function createSessionSchedule($data) {
        return $this->model->createSessionSchedule($data);
    }

    public function getSessionSchedulesByTeacher($teacherId) {
        return $this->model->getSessionSchedulesByTeacher($teacherId);
    }

    public function getAllSessionSchedules() {
        return $this->model->getAllSessionSchedules();
    }

    public function updateSessionSchedule($id, $data) {
        return $this->model->updateSessionSchedule($id, $data);
    }

    public function deleteSessionSchedule($id) {
        return $this->model->deleteSessionSchedule($id);
    }
}