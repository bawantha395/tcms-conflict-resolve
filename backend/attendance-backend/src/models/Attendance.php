<?php
class Attendance {
    private $conn;
    private $table = "attendance";

    public $user_id;
    public $class_id;
    public $time_stamp;

    public function __construct($db) {
        $this->conn = $db;
    }

    // Mark attendance
    public function mark() {
        $query = "INSERT INTO " . $this->table . " 
                  SET user_id = :user_id, 
                      class_id = :class_id, 
                      time_stamp = :time_stamp";

        $stmt = $this->conn->prepare($query);
        // echo json_encode(array("query" => $query));
        // Sanitize input
        $this->user_id = htmlspecialchars(strip_tags($this->user_id));
        $this->class_id = htmlspecialchars(strip_tags($this->class_id));
        $this->time_stamp = htmlspecialchars(strip_tags($this->time_stamp));

        // Bind parameters
        $stmt->bindParam(":user_id", $this->user_id);
        $stmt->bindParam(":class_id", $this->class_id);
        $stmt->bindParam(":time_stamp", $this->time_stamp);

        if($stmt->execute()) {
            return true;
        }
        
        return false;
    }

    // Delete old records
    public function deleteOld($days = 30) {
        $query = "DELETE FROM " . $this->table . " 
                  WHERE time_stamp < DATE_SUB(NOW(), INTERVAL :days DAY)";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":days", $days, PDO::PARAM_INT);
        
        return $stmt->execute();
    }

    // Get attendance for a specific user in a class
    public function getByUserAndClass() {
        $query = "SELECT * FROM " . $this->table . " 
                  WHERE user_id = :user_id AND class_id = :class_id 
                  ORDER BY time_stamp DESC";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":user_id", $this->user_id);
        $stmt->bindParam(":class_id", $this->class_id);
        $stmt->execute();

        return $stmt;
    }

    // Get all attendance records for a class
    public function getByClass() {
        $query = "SELECT * FROM " . $this->table . " 
                  WHERE class_id = :class_id 
                  ORDER BY time_stamp DESC";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":class_id", $this->class_id);
        $stmt->execute();

        return $stmt;
    }
}
?>