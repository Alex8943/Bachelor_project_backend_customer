import express from 'express';
import logger from '../other_services/winstonLogger';
import {Genre} from '../other_services/model/seqModel';
import sequelize from '../other_services/sequelizeConnection';
import {Review} from '../other_services/model/seqModel';
import verifyUser from './authenticateUser';
const router = express.Router();


// Get top 3 genres
router.get('/genres/top', verifyUser, async (req, res) => {
    try {
        const genres = await getTopGenres();
        res.status(200).send(genres);
    } catch (err) {
        console.error('Error fetching top genres: ', err);
        res.status(500).send('Something went wrong while fetching top genres');
    }});

export async function getTopGenres() {
    try {
        const [topGenres] = await sequelize.query(`
              SELECT genre.id, genre.name, COUNT(review_genres.review_fk) AS review_count
              FROM genre
              LEFT JOIN review_genres ON genre.id = review_genres.genre_fk
              GROUP BY genre.id
              ORDER BY review_count DESC
              LIMIT 4;
        `);
  
          return topGenres;
    } catch (error) {
        console.error('Error fetching top genres:', error);
        throw error;
    }
};   


// Get all genres
router.get('/genres', verifyUser, async (req, res) => {
    try {
        const genres = await getGenres();
        res.status(200).send(genres);
    } catch (err) {
        console.error('Error fetching genres: ', err);
        res.status(500).send('Something went wrong while fetching genres');
    }
  });


  export async function getGenres() {
    try {
        const result = await Genre.findAll();
        logger.info('Genres fetched successfully');
        return result;
    } catch (err) {
        logger.error('ERROR: \n', err);
        throw err;
    }
  }


export default router;