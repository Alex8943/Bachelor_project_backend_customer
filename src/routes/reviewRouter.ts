import express from "express";
import { Review as Reviews, User, Media, Genre, ReviewGenres } from "../other_services/model/seqModel";
import logger from "../other_services/winstonLogger";
import sequelize from "../other_services/sequelizeConnection";
import { NumberDataTypeConstructor, QueryTypes } from "sequelize";
import conn from "../db_services/local_database/db_connection";
import { RowDataPacket } from "mysql2";
import verifyUser from "./authenticateUser";
import mysql from "mysql2/promise";

const router = express.Router();



// Function to sync with Database 2
async function syncToDatabase2(query: string, values: any[] = []) {
    const db2 = await mysql.createConnection({
        host: process.env.prod_host2,
        user: process.env.prod_user2,
        password: process.env.prod_password2,
        database: process.env.prod_database2,
        ssl: { rejectUnauthorized: true },
    });

    try {
        await db2.execute(query, values);
    } catch (error) {
        console.error("Error syncing to Database 2:", error);
    } finally {
        await db2.end();
    }
}



router.post("/review", verifyUser, async (req, res) => {
    try {
        const result = await createReview(req.body);
        res.status(200).send(result);
    } catch (err) {
        console.error("Error creating review: ", err);
        res.status(500).send("Something went wrong while creating the review");
    }
}); 

export async function createReview(values: any) {
    const t = await sequelize.transaction();

    try {
        const [review] = await sequelize.query(
            'INSERT INTO `review` (`id`, `media_fk`, `title`, `description`, `platform_fk`, `user_fk`, `createdAt`, `updatedAt`, `isBlocked`) VALUES (DEFAULT, ?, ?, ?, ?, ?, NOW(), NOW(), FALSE);',
            {
                replacements: [
                    values.media_fk,
                    values.title,
                    values.description,
                    values.platform_fk,
                    values.user_fk,
                ],
                type: QueryTypes.INSERT,
                transaction: t,
            }
        );

        // Sync to Database 2
        await syncToDatabase2(
            `INSERT INTO reviews (id, media_fk, title, description, platform_fk, user_fk, createdAt, updatedAt, deletedAt)
             VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW(), NULL);`,
            [
                review, // Review ID
                values.media_fk,
                values.title,
                values.description,
                values.platform_fk,
                values.user_fk,
            ]
        );

        if (values.genre_ids && values.genre_ids.length > 0) {
            const reviewGenreRecords = values.genre_ids.map((genre_id: number) => ({
                review_fk: review,
                genre_fk: genre_id,
            }));
            await ReviewGenres.bulkCreate(reviewGenreRecords, { transaction: t });
        }

        await t.commit();
        logger.info("Review created successfully");
        return { reviewId: review };
    } catch (err) {
        await t.rollback();
        logger.error("Error during review creation: ", err);
        throw err;
    }
}




router.put("/update/review/:id", verifyUser, async (req, res) => {
    try{
        const reviewId = parseInt(req.params.id); // Extract `id` from the URL as a number
        const result = await updateReview(reviewId, req.body); // Pass `reviewId` and `req.body` separately

        res.status(200).send(result);

    }catch(error){
        console.error("error creating review: ", error)
        res.status(500).send("Something went wrong with updating the review " )
    }
})

export async function updateReview(id: number, data: any) {
    try {
        const [updatedCount] = await Reviews.update(
            {
                title: data.title,
                description: data.description,
            },
            {
                where: { id: id },
            }
        );

        // Sync to Database 2
        await syncToDatabase2(
            `UPDATE reviews SET title = ?, description = ?, updatedAt = NOW() WHERE id = ?;`,
            [data.title, data.description, id]
        );

        await ReviewGenres.destroy({ where: { review_fk: id } });

        if (data.genre_ids && data.genre_ids.length > 0) {
            const reviewGenreRecords = data.genre_ids.map((genre_id: number) => ({
                review_fk: id,
                genre_fk: genre_id,
            }));
            await ReviewGenres.bulkCreate(reviewGenreRecords);
        }

        logger.info("Review updated successfully");
        return { message: "Review updated successfully" };
    } catch (error) {
        logger.error("Error during review update: ", error);
        throw error;
    }
}

router.get("/reviews/:max/:offset", verifyUser, async (req, res) => {
    try {
      const max = parseInt(req.params.max, 10); // Number of reviews to fetch
      const offset = parseInt(req.params.offset, 10); // Starting point for fetching reviews
  
      const reviews = await getRangeOfReviews(max, offset); // Pass both max and offset to the function
      res.status(200).send(reviews);
    } catch (err) {
      console.error("Error fetching reviews: ", err);
      res.status(500).send({ error: "Failed to fetch reviews" });
    }
  });
  
  // Function to fetch reviews
  export async function getRangeOfReviews(max: number, offset: number) {
    try {
      const reviews = await Reviews.findAll({
        where: {
          isBlocked: false,
        },
        limit: max,
        offset: offset,
        include: {
          model: Genre,
          through: { attributes: [] },
        },
      });
      console.log(`Reviews fetched: ${reviews.length}, Offset: ${offset}`);
      return reviews;
    } catch (error) {
      console.error("Error fetching specific reviews: ", error);
      throw error;
    }
  }
  



//Get one review 
router.get("/getReview/:id", verifyUser, async (req, res) => {
    try {
        
        const result = await getOneReview(req.params);
        logger.info("##############RESULT FOR FETCHING ONE REVIEW: ", result);
        res.status(200).send(result);
    } catch (err) {
        console.error("Error fetching review: ", err);
        res.status(500).send("Something went wrong while fetching the review");
    }
});


export async function getOneReview(value: any) {
    try {
        const result = await Reviews.findOne({
            where: { id: value.id},
            include: [
                {
                    model: User,
                    attributes: ["name"],
                },
                {
                    model: Media,
                    attributes: ["name"],
                },
                {
                    model: Genre,
                    attributes: ["name"],
                },
            ]
        });
        logger.info("Found review: ", result);
        return result;
    } catch (err) {
        logger.error("ERROR: \n", err);
        throw err;
    }
}



// Get all reviews with media, user, and genres
router.get("/softDeletedReviews", verifyUser, async (req, res) => {
    try {
        const reviews = await getReviewsThatIsSoftDeleted();
        res.status(200).send(reviews);
    } catch (err) {
        console.error("Error fetching reviews: ", err);
        res.status(500).send("Something went wrong while fetching reviews");
    }
});

export async function getReviewsThatIsSoftDeleted() {
    try {
        const result = await Reviews.findAll({
            where: {
                isBlocked: true, // Ensure only non-blocked reviews are fetched
            },
            include: [
                {
                    model: User,
                    attributes: ["name"],
                },
                {
                    model: Media,
                    attributes: ["name"],
                },
                {
                    model: Genre,
                    attributes: ["name"],
                    through: { attributes: [] },
                },
            ],
        });
        logger.info("Reviews fetched successfully");
        return result;
    } catch (err) {
        logger.error("ERROR: \n", err);
        throw err;
    }
}


// Delete review endpoint
router.put("/delete/review/:id", verifyUser, async (req, res) => {
    try {
        // TODO: ensure that only yhe logged user has access to delete its own reviews
        const result = await deleteReview(req.params.id); // Pass only the ID
        console.log("Deleting review with ID: ", req.params.id);

        res.status(200).send(result);
    } catch (error) {
        console.error("Error deleting review: ", error);
        res.status(500).send("Something went wrong with deleting the review.");
    }
});

export async function deleteReview(id: any) {
    try {
        const review = await Reviews.findByPk(id);
        if (!review) {
            return "Review does not exist";
        } else {
            await Reviews.update(
                { isBlocked: true },
                { where: { id: id } }
            );

            // Sync to Database 2
            await syncToDatabase2(
                `UPDATE reviews SET deletedAt = NOW(), updatedAt = NOW() WHERE id = ?;`,
                [id]
            );

            logger.info("Review deleted successfully");
            return { message: "Review deleted successfully" };
        }
    } catch (error) {
        logger.error("Error during review deletion: ", error);
        throw error;
    }
}




router.put("/undelete/review/:id", verifyUser, async (req, res) => {
    try {
        const result = await unDeleteReview(req.params.id); // Pass only the ID
        console.log("Undeleting review with ID: ", req.params.id);

        res.status(200).send(result);
    } catch (error) {
        console.error("Error undeleting review: ", error);
        res.status(500).send("Something went wrong with undeleting the review.");
    }
});

export async function unDeleteReview(id: any) {
    try {
        const review = await Reviews.findByPk(id);
        if (!review) {
            return "Review does not exist";
        } else if (review.isBlocked === false) {
            return "Review is not deleted";
        } else {
            await Reviews.update(
                { isBlocked: false },
                { where: { id: id } }
            );

            // Sync to Database 2
            await syncToDatabase2(
                `UPDATE reviews SET deletedAt = NULL, updatedAt = NOW() WHERE id = ?;`,
                [id]
            );

            logger.info("Review undeleted successfully");
            return { message: "Review undeleted successfully" };
        }
    } catch (error) {
        logger.error("Error during review undeletion: ", error);
        throw error;
    }
}



export default router;
