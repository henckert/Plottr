import createApp from './app';
import { getConfig } from './config';

const app = createApp();
const config = getConfig();

const port = config.PORT || 3000;
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Plottr server listening on port ${port}`);
});
