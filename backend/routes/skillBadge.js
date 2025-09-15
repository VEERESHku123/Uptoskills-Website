
const express = require('express');
const pool = require('../config/database');

const router = express.Router();

// -------------------- CREATE TABLE (for setup only) --------------------
router.get('/create-skill-badges-table', async (req, res) => {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS skill_badges (
        id BIGSERIAL PRIMARY KEY,
        student_id BIGINT NOT NULL,
        badge_name VARCHAR(255) NOT NULL,
        badge_description TEXT,
        verified BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_trigger WHERE tgname = 'trg_skill_badges_updated_at'
        ) THEN
          CREATE TRIGGER trg_skill_badges_updated_at
          BEFORE UPDATE ON skill_badges
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
        END IF;
      END;
      $$;

      CREATE INDEX IF NOT EXISTS idx_skill_badges_student_id
      ON skill_badges(student_id);
    `;

    await pool.query(createTableQuery);

    res.status(200).json({
      success: true,
      message: 'skill_badges table created (or already exists)',
    });
  } catch (error) {
    console.error('Error creating table:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating skill_badges table',
      error: error.message,
    });
  }
});

/**
 * POST /api/badges
 * body: { student_id, badge_name, badge_description?, verified? }
 */
router.post('/badges', async (req, res, next) => {
  try {
    const { student_id, badge_name, badge_description, verified } = req.body;
    if (!student_id || !badge_name) {
      return res.status(400).json({ success: false, message: 'student_id and badge_name are required' });
    }

    const result = await pool.query(
      `INSERT INTO skill_badges (student_id, badge_name, badge_description, verified)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [student_id, badge_name, badge_description || null, !!verified]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/badges
 * optionally ?student_id=123
 */
router.get('/badges', async (req, res, next) => {
  try {
    const { student_id } = req.query;
    let result;
    if (student_id) {
      result = await pool.query(
        `SELECT * FROM skill_badges WHERE student_id = $1 ORDER BY created_at DESC`,
        [student_id]
      );
    } else {
      result = await pool.query(`SELECT * FROM skill_badges ORDER BY created_at DESC`);
    }
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/badges/:id
 */
router.get('/badges/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM skill_badges WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Badge not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/students/:studentId/badges
 */
router.get('/students/:studentId/badges', async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const result = await pool.query(
      `SELECT * FROM skill_badges WHERE student_id = $1 ORDER BY created_at DESC`,
      [studentId]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/badges/:id
 * Accepts partial updates. Only updates fields passed in body.
 * allowed fields: badge_name, badge_description, verified, student_id
 */
router.put('/badges/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const allowed = ['badge_name', 'badge_description', 'verified', 'student_id'];
    const fields = [];
    const values = [];
    let idx = 1;

    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        fields.push(`${key} = $${idx}`);
        values.push(req.body[key]);
        idx++;
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields provided to update' });
    }

    values.push(id); // last param for WHERE
    const query = `UPDATE skill_badges SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
    const result = await pool.query(query, values);

    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Badge not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/badges/:id/verify
 * body: { verified: true|false } // if omitted, toggle current value
 */
router.patch('/badges/:id/verify', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { verified } = req.body;
    let result;

    if (typeof verified === 'boolean') {
      result = await pool.query('UPDATE skill_badges SET verified = $1 WHERE id = $2 RETURNING *', [verified, id]);
    } else {
      result = await pool.query('UPDATE skill_badges SET verified = NOT verified WHERE id = $1 RETURNING *', [id]);
    }

    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Badge not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/badges/:id
 */
router.delete('/badges/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM skill_badges WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Badge not found' });
    res.json({ success: true, message: 'Badge deleted', data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
