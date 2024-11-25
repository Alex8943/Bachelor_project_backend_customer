import express from "express";
import { Review as Reviews, User, Media, Genre, ReviewGenres } from "../other_services/model/seqModel";
import logger from "../other_services/winstonLogger";
import sequelize from "../other_services/sequelizeConnection";
import { NumberDataTypeConstructor, QueryTypes } from "sequelize";
import conn from "../db_services/db_connection";
import { RowDataPacket } from "mysql2";

const router = express.Router();



router.post("/review", async (req, res) => {
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
                transaction: t
            }
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


// Route to search for a review by title
router.get("/review/:title", async (req, res) => {
    
    try {
        // Access title from req.params instead of req.body
        const result = await searchReviewByTitle(req.params.title);
        console.log("Result: ", result)

        res.status(200).send(result); 
    } catch (error) {
        console.error("Error searching review by title: ", error);
        res.status(500).send("Something went wrong while searching the review by title");
    }
});

export async function searchReviewByTitle(value: string) {
    const connection = await conn.getConnection();
    try {
        const query = `
            SELECT 
                r.id, r.title, r.description, 
                u.name AS userName, 
                m.name AS mediaName, 
                GROUP_CONCAT(g.name) AS genreNames
            FROM stohtpsd_company.review r
            LEFT JOIN stohtpsd_company.user u ON r.user_fk = u.id
            LEFT JOIN stohtpsd_company.media m ON r.media_fk = m.id
            LEFT JOIN stohtpsd_company.review_genres rg ON r.id = rg.review_fk
            LEFT JOIN stohtpsd_company.genre g ON rg.genre_fk = g.id
            WHERE r.title LIKE ?
            GROUP BY r.id
        `;
        const [rows] = await connection.execute<RowDataPacket[]>(query, [`%${value}%`]);

        if (rows.length === 0) {
            logger.error("No reviews found matching the title");
            return null;
        }

        logger.info("Reviews fetched successfully");
        return rows;
    } catch (error) {
        logger.error("Error searching reviews by title: ", error);
        throw error;
    } finally {
        connection.release();
    }
}



router.put("/update/review/:id", async (req, res) => {
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
        // Update review by `id` with new `title` and `description` from `data`
        const [updatedCount] = await Reviews.update(
            {
                title: data.title,
                description: data.description
            },
            {
                where: { id: id }
            }
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

router.get("/reviews/:max", async (req, res) => {
    try {
        const reviews = await getRangeOfReviews(req.params.max);
        res.status(200).send(reviews);
    } catch (err) {
        console.error("Error fetching reviews: ", err);
    }});


// Function to fetch reviews
export async function getRangeOfReviews(max: any) {
    try {
        const reviews = await Reviews.findAll({
            where: {
                isBlocked: false,
            },
            limit: max, // Sequelize will now receive a number
        });
        return reviews;
    } catch (error) {
        logger.error("Error fetching specific reviews: ", error);
        throw error;
    }
}


//Get one review 
router.get("/getReview/:id", async (req, res) => {
    try {
        console.log("TEST")

        const result = await getOneReview(req.params);

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
router.get("/softDeletedReviews", async (req, res) => {
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

export default router;
