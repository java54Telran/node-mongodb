import MongoConnection from "./mongo/MongoConnection.mjs";
const DB_NAME = 'sample_mflix';
const COLLECTION_MOVIES_NAME = "movies";
const COLLECTION_COMMENTS_NAME = "comments";
const mongoConnection = new MongoConnection(process.env.MONGO_URI, DB_NAME);
const collectionMovies = mongoConnection.getCollection(COLLECTION_MOVIES_NAME);
const collectionComments = mongoConnection.getCollection(COLLECTION_COMMENTS_NAME);
const query1 = collectionComments.aggregate([
 
  {
      '$lookup': {
          'from': 'movies',
          'localField': 'movie_id',
          'foreignField': '_id',
          'as': 'movies'
      }
  }, {
      '$match': {
          'movies.0': {
              '$exists':true
          }
      }
  }, {
    '$limit': 5
}, {
      '$replaceRoot': {
          'newRoot': {
              '$mergeObjects': [
                  {
                      'movie_title': {
                          '$arrayElemAt': [
                              '$movies.title', 0
                          ]
                      }
                  }, '$$ROOT'
              ]
          }
      }
  }, {
      '$project': {
          'movies': 0,
          'movie_id': 0
      }
  }
]).toArray();
  
const query2 = collectionMovies.aggregate([
  {
      '$facet': {
          'avgImdbRating': [
              {
                  '$group': {
                      '_id': null, 
                      'avgValue': {
                          '$avg': '$imdb.rating'
                      }
                  }
              }
          ], 
          'filteredAvgValues': [
              {
                  '$match': {
                      'genres': 'Comedy', 
                      'year': 2010
                  }
              }
          ]
      }
  }, {
      '$unwind': {
          'path': '$avgImdbRating'
      }
  }, {
      '$unwind': {
          'path': '$filteredAvgValues'
      }
  }, {
      '$match': {
          '$expr': {
              '$lt': [
                  '$avgImdbRating.avgValue', '$filteredAvgValues.imdb.rating'
              ]
          }
      }
  }, {
      '$project': {
          'title': '$filteredAvgValues.title'
      }
  }
]).toArray();
Promise.all([query1, query2]).then(data => {
    data.forEach((res, index) => console.log("query" + (index + 1), res));
    mongoConnection.closeConnection();
} )