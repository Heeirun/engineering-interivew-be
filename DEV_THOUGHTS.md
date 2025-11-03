Hi folks, here are some thoughts I had while developiong this project

This is exciting to try out Prisma and Fastify here! I'm eager to try developing with them as the documentation seems exciting to me coming from a Ruby on Rails background where convention and developer experience(DX) is a priority. 

I have local dev up and running pretty quickly with a plan and executing on it with claude. Some initial notes about the project structure:

Repository vs Service: I found this interesting as we use repositories as a data access layer to encapsulate generic queries for reuse in business logic specific services. In Ruby on Rails we have an ActiveRecord model layer which handles this for us with some magic. I'm curious if a similar pattern is used in your codebase to encapsulate this data access layer



docker-compose did run into some hiccups with the need to compile typescript into javascript before running the node server. As part of spinning up the app container, we want to migrate the db and run seed. The seed was initially written in tsx instead of js. This resulted in a bit of debugging. Fix here was to use a js seed instead of tsx seed. Curious if this is an issue with regular feature development. I understand that we want to get the gains of type checking to reduce runtime errors and make code maintainable but I'm curious if strong type checks result in a hit to the developer experience in regular feature development


# Future considerations

## Robust authorization
* The current implementation of tasks authorization assumes users work on tasks independently. Hence tasks can be created, updated, deleted as it relates to a single user. 
* If requirements around tasks change to have tasks be collaborated on by multiple users, we should express authorization in data using TaskAccessControl records which are a join table between Tasks and Users. This is a great way to ensure data integrity by expressing this as data in the DB instead of an array column (postresql supports this but no referential integrity of ensuring userIds are valid in the array)

## Proper authentication
* We want to ensure that we can verify the actor accessing this API is who they say they are
* We could sign a JWT with user information and pass it as a response for signing into the service. Users of this API can then set the signed JWT in headers of API request. We can decode the JWT on the server and authenticate the user.

## Soft deletion of tasks
* Let’s preserve as much data as possible
* Hard deletion puts us in a touch spot if users want their data back. Speaking from experience here as I’ve run some tasks to recreate customer data from a point in time snapshot of the database, not fun work!

## Sorting and Filtering on index endpoint
* Would require indexing attributes relevant to the user like created_at, title for sorting

Swagger Open API documentation
* Use @fastify/swagger + @fastify/swagger-ui to get API documentation up for users of this API

