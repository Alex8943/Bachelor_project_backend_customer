import express from 'express';

import { 
    ReviewActions, 
    Review, 
    ReviewGenres, 
    Genre, 
    User 
} from '../other_services/model/seqModel'; 

import logger from '../other_services/winstonLogger';

const router = express.Router();

// Endpoint to like a review
router.post('/like', async (req, res) => {
    try {
        const result = await likeAReview(req.body.userId, req.body.reviewId);
        res.status(200).send(result);
    } catch (error) {
        console.error('Error liking review:', error);
        res.status(500).json({ message: 'An error occurred while liking the review.' });
    }
});

export async function likeAReview(userId: number, reviewId: number): Promise<string> {
    try {
        if (!userId || !reviewId) {
            return 'User ID and Review ID are required.';
        }

        // Check if the user already liked this review
        const existingAction = await ReviewActions.findOne({
            where: { user_fk: userId, review_fk: reviewId },
        });

        if (existingAction) {
            return 'You have already liked this review';
        }

        // Create a new like action
        await ReviewActions.create({
            user_fk: userId,
            review_fk: reviewId,
            review_gesture: true,
        });

        // Fetch the review to ensure it exists
        const review = await Review.findByPk(reviewId, {
            include: {
                model: Genre,
                through: { attributes: [] }, // Fetch associated genres
            },
        });

        if (!review) {
            return 'Review not found.';
        }

        // Check if genres exist for the review
        const genres = review.get('Genres') as Genre[];
        if (!genres || genres.length === 0) {
            console.log(`No genres found for review ${reviewId}.`);
            return 'No genres associated with this review.';
        }

        console.log('Fetched genres:', genres);

        // Ensure all genres are linked in the review_genres table
        await Promise.all(
            genres.map(async (genre) => {
                const existingLink = await ReviewGenres.findOne({
                    where: {
                        review_fk: reviewId,
                        genre_fk: genre.id,
                    },
                });

                if (!existingLink) {
                    console.log(`Linking review ${reviewId} with genre ${genre.id}`);
                    await ReviewGenres.create({
                        review_fk: reviewId,
                        genre_fk: genre.id,
                    });
                } else {
                    console.log(`Link already exists for review ${reviewId} and genre ${genre.id}`);
                }
            })
        );

        return 'Review liked successfully and genres linked.';
    } catch (error) {
        console.error('Error liking review:', error);
        throw new Error('An error occurred while liking the review.');
    }
}



// Endpoint to dislike a review
router.post('/dislike', async (req, res) => {
    try{
        const result = await disLikeReview(req.body.userId, req.body.reviewId);
        res.status(200).send(result);
    
    } catch (error) {
        console.error('Error disliking review:', error);
        res.status(500).json({ message: 'An error occurred while disliking the review.' });
    }
});

export async function disLikeReview(userId: number, reviewId: number) {
    try {
        if (!userId || !reviewId) {
            return 'User ID and Review ID are required.';
        }

        // Check if the user already liked this review
        const existingAction = await ReviewActions.findOne({
            where: { user_fk: userId, review_fk: reviewId },
        });

        if (existingAction) {
            return 'You have already liked or disliked this review.';
        }

        // Create a new dislike action
        await ReviewActions.create({
            user_fk: userId,
            review_fk: reviewId,
            review_gesture: false, // False indicates a "dislike"
        });

        // Fetch the review and its genres
        const review = await Review.findByPk(reviewId, {
            include: {
                model: Genre,
                through: { attributes: [] }, // Include genres without junction table attributes
            },
        });

        if (!review) {
            return 'Review not found.';
        }

        // Ensure genres are associated in ReviewGenres table
        const genres = review.get('Genres') as Genre[];
        if (genres && genres.length > 0) {
            await Promise.all(
                genres.map(async (genre) => {
                    const existingAssociation = await ReviewGenres.findOne({
                        where: {
                            review_fk: reviewId,
                            genre_fk: genre.id,
                        },
                    });

                    if (!existingAssociation) {
                        await ReviewGenres.create({
                            review_fk: reviewId,
                            genre_fk: genre.id,
                        });
                    }
                })
            );
        }
        logger.info('Review disliked successfully and genres linked.');
        return 'Review disliked successfully and genres linked.';
    } catch (error) {
        console.error('Error disliking review:', error);
        logger.error('Error disliking review:', error);
    }
};


router.get('/liked/:userId', async (req, res) => {
    try {
        const likedReviews = await getAllLikedReviewsFromUser(Number(req.params.userId));
        res.status(200).send(likedReviews);
    } catch (error) {
        console.error('Error fetching liked reviews:', error);
        res.status(500).json({ message: 'An error occurred while fetching liked reviews.' });
    }
});

export async function getAllLikedReviewsFromUser(userId: number) {
    try {
        if (!userId) {
            throw new Error('User ID is required.');
        }

        const likedReviews = await ReviewActions.findAll({
            where: {
                user_fk: userId,
                review_gesture: true,
            },
            include: [
                {
                    model: Review, // Include the related Review model
                    attributes: ['id', 'title', 'description', 'createdAt', 'updatedAt'], // Specify which fields to fetch
                    include: [
                        {
                            model: Genre, // Include related genres for the review
                            attributes: ['id', 'name'],
                        },
                        {
                            model: User, // Include the user who created the review
                            attributes: ['id', 'name', 'email'],
                        },
                    ],
                },
            ],
        });

        if (!likedReviews || likedReviews.length === 0) {
            return 'No liked reviews found.';
        }

        return likedReviews;
    } catch (error) {
        console.error('Error fetching liked reviews:', error);
        throw new Error('An error occurred while fetching liked reviews.');
    }
}

export default router;
