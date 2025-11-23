-- Study Packs schema
CREATE TABLE IF NOT EXISTS study_packs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  teacher_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) DEFAULT 0.00,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS study_pack_videos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  study_pack_id INT NOT NULL,
  file_path VARCHAR(255),
  title VARCHAR(255),
  FOREIGN KEY (study_pack_id) REFERENCES study_packs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS study_pack_documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  study_pack_id INT NOT NULL,
  file_path VARCHAR(255),
  title VARCHAR(255),
  FOREIGN KEY (study_pack_id) REFERENCES study_packs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS study_pack_links (
  id INT AUTO_INCREMENT PRIMARY KEY,
  study_pack_id INT NOT NULL,
  link_url VARCHAR(255) NOT NULL,
  link_title VARCHAR(255),
  FOREIGN KEY (study_pack_id) REFERENCES study_packs(id) ON DELETE CASCADE
);
