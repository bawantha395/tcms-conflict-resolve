// ...existing code...
import React from 'react';

const Sidebar = ({ sections = [] }) => {
  // ensure sections is an array to avoid .map on undefined
  if (!Array.isArray(sections) || sections.length === 0) {
    return (
      <aside className="sidebar" style={{ padding: 16 }}>
        <p style={{ margin: 0, color: '#666' }}>No sections</p>
      </aside>
    );
  }

  return (
    <aside className="sidebar" style={{ padding: 16 }}>
      {sections.map((section, sIdx) => (
        <div key={sIdx} className="sidebar-section" style={{ marginBottom: 12 }}>
          {section.title && <h4 style={{ margin: '0 0 8px 0' }}>{section.title}</h4>}
          {Array.isArray(section.items) && (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {section.items.map((item, iIdx) => (
                <li key={iIdx} style={{ marginBottom: 6 }}>
                  {item.to ? <a href={item.to}>{item.label}</a> : <span>{item.label}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </aside>
  );
};

export default Sidebar;
// ...existing code...