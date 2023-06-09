import Queue from 'bull';
import imageThumbnail from 'image-thumbnail';
import fs from 'fs';
import { ObjectId } from 'mongodb';
import dbClient from './utils/db';

const fileQueue = new Queue('fileQueue', {
  redis: {
    host: '127.0.0.1',
    port: 6379,
  },
});

const userQueue = new Queue('userQueue', {
  redis: {
    host: '127.0.0.1',
    port: 6379,
  },
});

const createThumbnails = async (width, path) => {
  const thumbnail = await imageThumbnail(path, width);
  return thumbnail;
};

fileQueue.process(async (job, done) => {
  const { userId, fileId } = job.data;

  if (!userId) done(new Error('Missing userId'));
  if (!fileId) done(new Error('Missing fileId'));

  const docs = await dbClient.db
    .collection('files')
    .findOne({ _id: ObjectId(fileId), userId });

  if (docs === null) done(Error('File not found'));

  const SIZE_100 = await createThumbnails(100, docs.localPath);
  const SIZE_250 = await createThumbnails(250, docs.localPath);
  const SIZE_500 = await createThumbnails(500, docs.localPath);

  await fs.promises.writeFile(`${docs.localPath}_100`, SIZE_100);
  await fs.promises.writeFile(`${docs.localPath}_250`, SIZE_250);
  await fs.promises.writeFile(`${docs.localPath}_500`, SIZE_500);
});

userQueue.process(async (job, done) => {
  const { userId } = job.data || null;
  if (!userId) done(new Error('Missing userId'));

  const user = await dbClient.db
    .collection('users')
    .findOne({ _id: ObjectId(userId) });

  const docs = await dbClient.db.collection('files').findOne({ userId });

  if (!docs) done(Error('User not found'));
  console.log(`Welcome ${user.email}!`);
});